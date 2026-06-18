import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Rekord Extension Test Suite', () => {
	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('undefined_publisher.rekord'));
	});
});