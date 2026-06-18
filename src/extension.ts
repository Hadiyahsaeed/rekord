import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CheckpointPanel } from './CheckpointPanel';
import { GitHubService } from './GitHubService';

function getFiles(dirPath: string, arrayOfFiles: any[] = [], basePath: string = dirPath): any[] {
	const skipFolders = ['.rekord', 'node_modules', '.git', 'dist', '__pycache__'];
	const files = fs.readdirSync(dirPath);
	files.forEach(file => {
		const fullPath = path.join(dirPath, file);
		if (fs.statSync(fullPath).isDirectory()) {
			if (!skipFolders.includes(file)) {
				getFiles(fullPath, arrayOfFiles, basePath);
			}
		} else {
			try {
				const content = fs.readFileSync(fullPath, 'utf8');
				arrayOfFiles.push({
					path: path.relative(basePath, fullPath),
					content: content
				});
			} catch (e) {}
		}
	});
	return arrayOfFiles;
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Rekord is active!');

	// Command: Setup Gemini key
	const setupAICmd = vscode.commands.registerCommand('rekord.setupAI', async () => {
		const key = await vscode.window.showInputBox({
			prompt: 'Enter your Gemini API Key',
			placeHolder: 'AIza...',
			password: true
		});
		if (!key) return;
		await context.secrets.store('rekord.geminiKey', key);
		vscode.window.showInformationMessage('✅ Rekord: Gemini API key saved!');
	});

	// Command: Setup GitHub token
	const setupCmd = vscode.commands.registerCommand('rekord.setup', async () => {
		const token = await vscode.window.showInputBox({
			prompt: 'Enter your GitHub Personal Access Token',
			placeHolder: 'ghp_...',
			password: true
		});
		if (!token) return;
		await context.secrets.store('rekord.githubToken', token);
		vscode.window.showInformationMessage('✅ Rekord: GitHub token saved securely!');
	});

	// Command: Save checkpoint
	const checkpointCmd = vscode.commands.registerCommand('rekord.checkpoint', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace open!');
			return;
		}
		const projectPath = workspaceFolders[0].uri.fsPath;
		const projectName = path.basename(projectPath);
		const rekordPath = path.join(projectPath, '.rekord');
		if (!fs.existsSync(rekordPath)) {
			fs.mkdirSync(rekordPath);
		}
		const message = await vscode.window.showInputBox({
			prompt: 'Describe this checkpoint',
			placeHolder: 'e.g. Auth working, fixed login bug...'
		});
		if (!message) return;

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const checkpointPath = path.join(rekordPath, `checkpoint-${timestamp}.json`);
		const files = getFiles(projectPath);
		const checkpoint = {
			timestamp: new Date().toISOString(),
			message: message,
			files: files
		};
		fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
		vscode.window.showInformationMessage(`✅ Rekord: "${message}" saved!`);

		// Push to GitHub if token exists
		const token = await context.secrets.get('rekord.githubToken');
		if (token) {
			try {
				vscode.window.showInformationMessage('📤 Rekord: Pushing to GitHub...');
				const github = new GitHubService(token);
				const repoUrl = await github.createRepo(
					`rekord-${projectName}`,
					`Rekord auto-documentation for ${projectName}`
				);
				await github.pushCheckpoint(`rekord-${projectName}`, message, files);

				// Generate AI README if Gemini key exists
				const geminiKey = await context.secrets.get('rekord.geminiKey');
				if (geminiKey) {
					vscode.window.showInformationMessage('🤖 Rekord: Generating README with AI...');
					const { ReadmeGenerator } = require('./ReadmeGenerator');
					const generator = new ReadmeGenerator(geminiKey);
					const readme = await generator.generate(projectName, files, message);
					await github.pushReadme(`rekord-${projectName}`, readme);
					vscode.window.showInformationMessage('✅ Rekord: AI README pushed to GitHub!');
				}

				vscode.window.showInformationMessage(`✅ Rekord: Done! ${repoUrl}`);
			} catch (e: any) {
    vscode.window.showWarningMessage(`⚠️ Rekord: ${e.message}`);
}
		}

		CheckpointPanel.createOrShow(rekordPath, projectPath);
	});

	// Command: Open timeline
	const timelineCmd = vscode.commands.registerCommand('rekord.timeline', () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace open!');
			return;
		}
		const projectPath = workspaceFolders[0].uri.fsPath;
		const rekordPath = path.join(projectPath, '.rekord');
		CheckpointPanel.createOrShow(rekordPath, projectPath);
	});

	context.subscriptions.push(setupAICmd, setupCmd, checkpointCmd, timelineCmd);
}

export function deactivate() {}