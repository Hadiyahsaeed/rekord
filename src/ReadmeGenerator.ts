import { GoogleGenerativeAI } from '@google/generative-ai';

export class ReadmeGenerator {
	private client: GoogleGenerativeAI;

	constructor(apiKey: string) {
		this.client = new GoogleGenerativeAI(apiKey);
	}

	async generate(
		projectName: string,
		files: { path: string; content: string }[],
		checkpointMessage: string
	): Promise<string> {
		const fileSummary = files
			.slice(0, 10)
			.map(f => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``)
			.join('\n\n');

		const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const prompt = `You are a technical writer. Generate a clean, professional README.md for this project.

Project name: ${projectName}
Latest checkpoint: "${checkpointMessage}"

Here are the project files:
${fileSummary}

Generate a README.md with:
- Project title and description
- Features list
- Installation instructions (based on the files you see)
- Usage instructions
- Tech stack

Be concise and accurate. Only include what you can infer from the actual files.`;

		const result = await model.generateContent(prompt);
		const response = await result.response;
		return response.text();
	}
}