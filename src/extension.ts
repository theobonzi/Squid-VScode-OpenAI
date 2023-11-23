import * as vscode from 'vscode';
import { OpenAIHandler } from './OpenAIHandler';

export function activate(context: vscode.ExtensionContext) {
    const openAIHandler = new OpenAIHandler(vscode, context);

    const explainCodeDisposable = vscode.commands.registerCommand('squid.explainThisCode', () => openAIHandler.explainCode());
    context.subscriptions.push(explainCodeDisposable);

    const AskQuestionDisposable = vscode.commands.registerCommand('squid.askQuestion', () => openAIHandler.askQuestionAboutCode());
    context.subscriptions.push(AskQuestionDisposable);

    const WriteUnitTestDisposable = vscode.commands.registerCommand('squid.writeUnitTest', () => openAIHandler.createAndRunUnitTest());
    context.subscriptions.push(WriteUnitTestDisposable);
}

export function deactivate() {
    // Nettoyage, si nécessaire, lors de la désactivation de l'extension.
}