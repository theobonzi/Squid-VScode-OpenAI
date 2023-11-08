import * as vscode from 'vscode';
import OpenAI from 'openai';

const codeCache: Record<string, string> = {};

const openai = new OpenAI({
    apiKey: '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',
  });

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('squid.explainThisCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            let code = editor.selection.isEmpty
                ? editor.document.getText()
                : editor.document.getText(editor.selection);
            
            console.log('==> Start explainThisCode');

            // Make an API call to OpenAI here to explain the code
            const explanation = await explainCodeWithOpenAI(code);

            // Show the explanation in VSCode
            if (explanation) {
                console.log('==> Show the explaination');
                vscode.window.showInformationMessage('🐙: ' + explanation);

            } else {
                console.log('==> No explaination received from Squid');
                vscode.window.showInformationMessage('No explanation received from Squid.');
            }
        } else {
            vscode.window.showInformationMessage('No file is currently open.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

export async function explainCodeWithOpenAI(code: string): Promise<string | undefined> {
    console.log('==> Call OpenAI');
    vscode.window.showInformationMessage('🐙 Squid is thinking ...');

    const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: `Tu es un ingenieur informatique, expert dans l'explication de code. Explique chaque code en moins de 100 tokens.` },
            { role: "user", content: `### Python\n${code}\n###` }
        ],
        temperature: 0,
        max_tokens: 100,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["###"]
    });

    const content = stream.choices[0]?.message?.content;

    return content !== null ? content : undefined;
}