import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Helper to execute commands with proper Windows shell support
async function execCommand(command: string, options: any = {}) {
  try {
    // On Windows, use cmd.exe instead of powershell for better npm compatibility
    const result = await execAsync(command, {
      ...options,
      shell: true, // Use system default shell
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });
    return result;
  } catch (error: any) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error message: ${error.message}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr}`);
    if (error.stdout) console.error(`Stdout: ${error.stdout}`);
    throw new Error(`Command failed: ${error.message}`);
  }
}

// POST /api/install-extension - Install VS Code extension on user's machine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // 'install', 'build', or 'check'

    // Path to vscode-extension directory
    // process.cwd() = D:\HaufeHackaton\frontend\frontend
    // Go up 2 levels to reach D:\HaufeHackaton, then access vscode-extension
    const extensionPath = path.join(process.cwd(), '..', '..', 'vscode-extension');

    if (!fs.existsSync(extensionPath)) {
      return NextResponse.json(
        { error: 'Extension source code not found', path: extensionPath },
        { status: 404 }
      );
    }

    switch (action) {
      case 'check':
        // Check if VS Code is installed and extension status
        try {
          const { stdout: vscodeVersion } = await execCommand('code --version');
          const { stdout: extensionList } = await execCommand('code --list-extensions');
          
          const vscodeVersionStr = String(vscodeVersion || '');
          const extensionListStr = String(extensionList || '');
          
          const isInstalled = extensionListStr.includes('devcor.devcor-ai-assistant') || 
                              extensionListStr.includes('devcor-ai-assistant');
          
          return NextResponse.json({
            success: true,
            vscodeInstalled: true,
            vscodeVersion: vscodeVersionStr.split('\n')[0],
            extensionInstalled: isInstalled,
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            vscodeInstalled: false,
            message: 'VS Code is not installed or not in PATH',
          });
        }

      case 'build':
        // Build and package the extension
        try {
          // Check if node_modules exists
          const nodeModulesPath = path.join(extensionPath, 'node_modules');
          if (!fs.existsSync(nodeModulesPath)) {
            // Install dependencies first
            console.log('Installing npm dependencies...');
            await execCommand('npm install', { cwd: extensionPath });
          }

          // Compile TypeScript
          console.log('Compiling TypeScript...');
          await execCommand('npm run compile', { cwd: extensionPath });

          // Check if vsce is installed globally
          try {
            await execCommand('vsce --version');
          } catch {
            // Install vsce globally
            console.log('Installing vsce globally...');
            await execCommand('npm install -g @vscode/vsce');
          }

          // Package the extension
          console.log('Packaging extension...');
          await execCommand('vsce package', { cwd: extensionPath });

          // Find the generated VSIX file
          const files = fs.readdirSync(extensionPath);
          const vsixFile = files.find(f => f.endsWith('.vsix'));

          if (!vsixFile) {
            return NextResponse.json(
              { error: 'Failed to create VSIX package' },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            vsixFile,
            message: 'Extension built successfully!',
          });
        } catch (error: any) {
          return NextResponse.json(
            { error: 'Build failed', details: error.message },
            { status: 500 }
          );
        }

      case 'install':
        // Install the extension to user's VS Code
        try {
          // First, try to find existing VSIX file
          const files = fs.readdirSync(extensionPath);
          let vsixFile = files.find(f => f.endsWith('.vsix'));

          if (!vsixFile) {
            // Build first if VSIX doesn't exist
            console.log('VSIX not found, building extension...');
            console.log('Installing dependencies...');
            await execCommand('npm install', { cwd: extensionPath });
            
            console.log('Compiling TypeScript...');
            await execCommand('npm run compile', { cwd: extensionPath });
            
            try {
              await execCommand('vsce --version');
              console.log('vsce is installed');
            } catch {
              console.log('Installing vsce...');
              await execCommand('npm install -g @vscode/vsce');
            }
            
            console.log('Packaging extension...');
            await execCommand('vsce package', { cwd: extensionPath });
            
            const newFiles = fs.readdirSync(extensionPath);
            vsixFile = newFiles.find(f => f.endsWith('.vsix'));
          }

          if (!vsixFile) {
            console.error('VSIX file not found after build');
            return NextResponse.json(
              { error: 'No VSIX file found and build failed' },
              { status: 500 }
            );
          }

          // Install the extension
          const vsixPath = path.join(extensionPath, vsixFile);
          console.log(`Installing extension from: ${vsixPath}`);
          await execCommand(`code --install-extension "${vsixPath}" --force`);

          return NextResponse.json({
            success: true,
            message: 'Extension installed successfully! Please reload VS Code.',
            vsixFile,
          });
        } catch (error: any) {
          console.error('❌ Installation error:', error);
          return NextResponse.json(
            { 
              error: 'Installation failed', 
              details: error.message,
              step: 'install',
              hint: 'Check if VS Code is running. Try closing VS Code and running install again.'
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: check, build, or install' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Extension installation error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}
