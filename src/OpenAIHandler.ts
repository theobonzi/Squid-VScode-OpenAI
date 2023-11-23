import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const outputChannel = vscode.window.createOutputChannel('🐙 Squid 🐙');

export class OpenAIHandler {
    private vscode: typeof vscode;
    private context: vscode.ExtensionContext;
    private openai: OpenAI;
    private outputChannel: vscode.OutputChannel;

    constructor(vscodeRef: typeof vscode, contextRef: vscode.ExtensionContext) {
        this.vscode = vscodeRef;
        this.context = contextRef;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.outputChannel = vscode.window.createOutputChannel('Squid Extension');
    }

    // Get Selected Text
    private getSelectedText(): string | undefined {
        const editor = this.vscode.window.activeTextEditor;
        if (!editor) {
            this.vscode.window.showInformationMessage('No file is currently open.');
            return undefined;
        }
        return editor.selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(editor.selection);
    }

    // Call OpenAI API
    private async callOpenAI(user_prompt: string, system_prompt: string, max_tokens: number): Promise<string | undefined> {
        try {
            console.log('==> Call OpenAI');
            console.log(user_prompt);

            vscode.window.showInformationMessage('🐙 Squid is thinking ...');
        
            const stream = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: system_prompt },
                    { role: "user", content: `###${user_prompt}###` }
                ],
                temperature: 0,
                max_tokens: max_tokens,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
                stop: ["###"]
            });
        
            const content = stream.choices[0]?.message?.content;
        
            return content !== null ? content : undefined;        
        } catch (error) {
            this.outputChannel.appendLine(`API Error: ${error}`);
            throw error;
        }
    }

    // Show OpenAI Answer
    private showOpenAIAnswer(explanation: string | undefined): void {
        if (explanation) {
            outputChannel.appendLine('🐙 Squid 🐙');
            outputChannel.appendLine(explanation);
            outputChannel.show(true);            
        } else {
            this.vscode.window.showInformationMessage('No explanation received from Squid.');
        }
    }

    // Explain this Code
    public async explainCode() {
        const code = this.getSelectedText();
        if (code) {
            try {
                const system_prompt = `Tu es un ingenieur informatique, expert dans l'explication de code. Explique chaque code en moins de 100 tokens.`;
                const explanation = await this.callOpenAI(code, system_prompt, 100);
                this.showOpenAIAnswer(explanation);
            } catch (error) {
                this.outputChannel.appendLine(`Error explaining code: ${error}`);
                this.vscode.window.showErrorMessage('An error occurred while explaining the code.');
            }
        } else {
            this.vscode.window.showInformationMessage('Please select some code.');
            return;
        }
    }

    // Ask Question About Code
    public async askQuestionAboutCode() {
        const code = this.getSelectedText();
        if (!code) {
            this.vscode.window.showInformationMessage('Please select some code to ask about.');
            return;
        }

        const question = await this.vscode.window.showInputBox({
            prompt: "What would you like to ask about the selected code?"
        });

        if (question) {
            try {
                const system_prompt = 'Tu es un ingenieur informatique, l\'utilisateur te donne du CODE et une QUESTION. Ton but est de répondre au mieux à ça question en moins de 100 tokens. Pas de phrase inutile une explication profesionnel et concise.';
                const user_prompt = `{QUESTION}= ###${question}###\n {CODE}=###${code}###`;
                const response = await this.callOpenAI(user_prompt, system_prompt, 100);
                this.showOpenAIAnswer(response);
            } catch (error) {
                this.outputChannel.appendLine(`Error when asking OpenAI: ${error}`);
                this.vscode.window.showErrorMessage('An error occurred while asking the question.');
            }
        }
    }

    // Create Unit Test
    public async createAndRunUnitTest() {
        const code = this.getSelectedText();
        if (!code) {
            this.vscode.window.showInformationMessage('Please select some code to create unit tests for.');
            return;
        }
        
        const editor = this.vscode.window.activeTextEditor;
        if (!editor) {
            this.vscode.window.showInformationMessage('Please open a file to create unit tests for.');
            return;
        }

        // Logique pour créer le fichier de test et écrire le squelette de base d'unit test
        const filePath = editor.document.fileName;
        const testFilePath = filePath.replace('.py', '_test.py');

        if (!fs.existsSync(testFilePath)) {
            const content = await this.generateUnitTestTemplate(path.basename(filePath), code);

            if (!content) {
                this.vscode.window.showErrorMessage('An error occurred while asking the question.');
            } else {
                fs.writeFileSync(testFilePath, content);
            }
            this.vscode.window.showInformationMessage(`Test file created at ${testFilePath}`);
        } else {
            this.vscode.window.showInformationMessage(`Test file already exists at ${testFilePath}`);
        }
    
        // Logique pour exécuter le fichier de test dans le terminal
        this.runUnitTestFile(testFilePath);
    }

    private generateTemplate(filename: string): string {
        return `import unittest
    import ${filename.replace('.py', '')}
    
    class Test${filename.replace('.py', '')}(unittest.TestCase):
        def test_example(self):
            # Add your tests here
            self.assertEqual(True, True)
    
    if __name__ == '__main__':
        unittest.main()
        `;
    }

    private sanitizeOutput(text?: string): string {
        if (!text) {
            throw new Error('No code block found in the response.');
        }
        // Split the text to find the beginning of the Python code block

        if (text.startsWith("```")) {
            const splitText = text.split("```python");
            if (splitText.length < 2) {
                throw new Error('Incorrect format: Python code block not found.');
            }
            // Further split to isolate and return only the code content
            const code = splitText[1].split("```")[0];
            return code.trim();
        } else {
            return text;
        }
    }

    private async generateUnitTestTemplate(FileName: string, code: string) {
        const template = this.generateTemplate(FileName);
        const py_template = "```python .... ```";
        const system_prompt = `Tu es un ingenieur informatique, l\'utilisateur te donne du CODE. Ton but est de créer le contenu d\'un fichier de test pour le CODE de l\'utilisateur. Voici un template de code unittest ###${template}### tu dois le modifier pour ajouter des test profesionnel en fonction de CODE. Ton retour fera obligatoirement moins de 300 tokens. Tu devras répondre sous la forme de code python.`;
        const user_prompt = `{CODE}=###${code}###\nReturn only python code in Markdown format, e.g. : ${py_template}}`;
        
        const response = await this.callOpenAI(user_prompt, system_prompt, 300);
        console.log(response);

        const new_response = this.sanitizeOutput(response); 
        console.log(new_response);
        return new_response;
    }
    

    private runUnitTestFile(testFilePath: string) {
        const terminal = this.vscode.window.createTerminal('🐙 Squid: Unittest');
        terminal.show();
        terminal.sendText(`python -m unittest ${testFilePath}`);
    }

    // Autres méthodes pour de nouvelles commandes...
}
