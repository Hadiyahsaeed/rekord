import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CheckpointPanel {
	public static currentPanel: CheckpointPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _rekordPath: string;
	private readonly _projectPath: string;

	public static createOrShow(rekordPath: string, projectPath: string) {
		if (CheckpointPanel.currentPanel) {
			CheckpointPanel.currentPanel._panel.reveal();
			CheckpointPanel.currentPanel._update();
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'rekordPanel',
			'Rekord Timeline',
			vscode.ViewColumn.Two,
			{ enableScripts: true }
		);

		CheckpointPanel.currentPanel = new CheckpointPanel(panel, rekordPath, projectPath);
	}

	private constructor(panel: vscode.WebviewPanel, rekordPath: string, projectPath: string) {
		this._panel = panel;
		this._rekordPath = rekordPath;
		this._projectPath = projectPath;
		this._update();

		this._panel.webview.onDidReceiveMessage(async message => {
			if (message.command === 'rollback') {
				await this._rollback(message.filename);
			}
		});

		this._panel.onDidDispose(() => {
			CheckpointPanel.currentPanel = undefined;
		});
	}

	private async _rollback(filename: string) {
		const checkpointFile = path.join(this._rekordPath, filename);
		const data = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));

		const confirm = await vscode.window.showWarningMessage(
			`Roll back to "${data.message}"? Current files will be saved first.`,
			'Yes, Roll Back',
			'Cancel'
		);

		if (confirm !== 'Yes, Roll Back') return;

		// Save current state before rolling back
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupPath = path.join(this._rekordPath, `backup-before-rollback-${timestamp}.json`);
		
		// Restore all files from checkpoint
		for (const file of data.files) {
			const filePath = path.join(this._projectPath, file.path);
			const dir = path.dirname(filePath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.writeFileSync(filePath, file.content, 'utf8');
		}

		vscode.window.showInformationMessage(`✅ Rolled back to "${data.message}" successfully!`);
		this._update();
	}

	private _update() {
		const checkpoints = this._getCheckpoints();
		this._panel.webview.html = this._getHtml(checkpoints);
	}

	private _getCheckpoints() {
		if (!fs.existsSync(this._rekordPath)) return [];
		
		return fs.readdirSync(this._rekordPath)
			.filter(f => f.endsWith('.json'))
			.map(f => {
				const data = JSON.parse(fs.readFileSync(path.join(this._rekordPath, f), 'utf8'));
				return {
					filename: f,
					timestamp: data.timestamp,
					message: data.message,
					fileCount: data.files.length,
					isBackup: f.startsWith('backup-')
				};
			})
			.reverse();
	}

	private _getHtml(checkpoints: any[]) {
		const items = checkpoints.map((cp, index) => `
			<div class="checkpoint ${cp.isBackup ? 'backup' : ''}">
				<div class="dot ${index === 0 ? 'latest' : ''}"></div>
				<div class="info">
					<div class="message">${cp.isBackup ? '🔒 ' : ''}${cp.message}</div>
					<div class="meta">${new Date(cp.timestamp).toLocaleString()} · ${cp.fileCount} files</div>
					${!cp.isBackup ? `<button class="rollback-btn" onclick="rollback('${cp.filename}')">⏪ Roll Back</button>` : ''}
				</div>
			</div>
		`).join('');

		return `<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { 
					font-family: var(--vscode-font-family);
					padding: 20px;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
				}
				h1 { font-size: 18px; margin-bottom: 20px; }
				.timeline {
					border-left: 2px solid var(--vscode-activityBarBadge-background);
					padding-left: 20px;
				}
				.checkpoint {
					display: flex;
					align-items: flex-start;
					margin-bottom: 24px;
					position: relative;
				}
				.backup { opacity: 0.5; }
				.dot {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					background: var(--vscode-activityBarBadge-background);
					position: absolute;
					left: -27px;
					top: 4px;
				}
				.dot.latest { background: #4CAF50; box-shadow: 0 0 6px #4CAF50; }
				.info { flex: 1; }
				.message { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
				.meta { font-size: 12px; opacity: 0.6; margin-bottom: 8px; }
				.rollback-btn {
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					padding: 4px 10px;
					border-radius: 4px;
					cursor: pointer;
					font-size: 12px;
				}
				.rollback-btn:hover { opacity: 0.8; }
			</style>
		</head>
		<body>
			<h1>⏺ Rekord Timeline</h1>
			<div class="timeline">
				${items.length > 0 ? items : '<p>No checkpoints yet. Press Ctrl+Shift+S to save one!</p>'}
			</div>
			<script>
				const vscode = acquireVsCodeApi();
				function rollback(filename) {
					vscode.postMessage({ command: 'rollback', filename: filename });
				}
			</script>
		</body>
		</html>`;
	}
}