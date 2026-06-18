const { Octokit } = require('@octokit/rest');
import * as fs from 'fs';
import * as path from 'path';

export class GitHubService {
	private octokit: any;
	private username: string = '';

	constructor(token: string) {
		this.octokit = new Octokit({ auth: token });
	}

	async getUsername(): Promise<string> {
		if (this.username) return this.username;
		const { data } = await this.octokit.users.getAuthenticated();
		this.username = data.login;
		return this.username;
	}

	async createRepo(name: string, description: string): Promise<string> {
		const username = await this.getUsername();
		
		try {
			const { data } = await this.octokit.repos.createForAuthenticatedUser({
				name,
				description,
				auto_init: true,
				private: false
			});
			return data.html_url;
		} catch (e: any) {
			if (e.status === 422) {
				return `https://github.com/${username}/${name}`;
			}
			throw e;
		}
	}

	async pushCheckpoint(
		repoName: string,
		checkpointMessage: string,
		files: { path: string; content: string }[]
	): Promise<void> {
		const username = await this.getUsername();

		for (const file of files) {
			try {
				// Check if file exists
				let sha: string | undefined;
				try {
					const { data } = await this.octokit.repos.getContent({
						owner: username,
						repo: repoName,
						path: file.path
					});
					if (!Array.isArray(data)) {
						sha = data.sha;
					}
				} catch (e) {
					// File doesn't exist yet, that's fine
				}

				await this.octokit.repos.createOrUpdateFileContents({
					owner: username,
					repo: repoName,
					path: file.path,
					message: `Rekord checkpoint: ${checkpointMessage}`,
					content: Buffer.from(file.content).toString('base64'),
					sha
				});
			} catch (e) {
				console.error(`Failed to push ${file.path}:`, e);
			}
		}
	}

	async pushReadme(repoName: string, content: string): Promise<void> {
		const username = await this.getUsername();
		
		let sha: string | undefined;
		try {
			const { data } = await this.octokit.repos.getContent({
				owner: username,
				repo: repoName,
				path: 'README.md'
			});
			if (!Array.isArray(data)) sha = data.sha;
		} catch (e) {}

		await this.octokit.repos.createOrUpdateFileContents({
			owner: username,
			repo: repoName,
			path: 'README.md',
			message: 'Rekord: Updated README',
			content: Buffer.from(content).toString('base64'),
			sha
		});
	}
}