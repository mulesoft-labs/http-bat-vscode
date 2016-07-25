// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { TextEditor, Range, DecorationOptions, window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, OverviewRulerLane } from 'vscode';

import { Bat } from 'http-bat';

var smallNumberDecorationType = window.createTextEditorDecorationType({
  textDecoration: "underline",
  overviewRulerColor: 'red',
  overviewRulerLane: OverviewRulerLane.Right,
  light: {
    // this color will be used in light color themes
    textDecoration: 'underline',
    color: 'red'
  },
  dark: {
    // this color will be used in dark color themes
    textDecoration: 'underline',
    color: 'red'
  }
});

// this method is called when your extension is activated. activation is
// controlled by the activation events defined in package.json
export function activate(ctx: ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "Wordcount" is now active!');

  // create a new word counter
  let wordCounter = new WordCounter();
  let controller = new WordCounterController(wordCounter);

  // add to a list of disposables which are disposed when this extension
  // is deactivated again.
  ctx.subscriptions.push(controller);
  ctx.subscriptions.push(wordCounter);
}

export class WordCounter {

  private _statusBarItem: StatusBarItem;

  public updateWordCount() {

    // Create as needed
    if (!this._statusBarItem) {
      this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    }

    // Get the current text editor
    let editor = window.activeTextEditor;
    if (!editor) {
      this._statusBarItem.hide();
      return;
    }

    let doc = editor.document;

    // Only update status if an MD file
    if (doc.languageId === "yaml") {
      let wordCount = this._getHints(doc, editor);

      if (wordCount == null) {
        editor.setDecorations(smallNumberDecorationType, []);
        this._statusBarItem.hide();
      } else {
        editor.setDecorations(smallNumberDecorationType, wordCount);
        this._statusBarItem.show();
        this._statusBarItem.text = "Run tests";
      }

    } else {
      this._statusBarItem.hide();
    }
  }

  public _getHints(doc: TextDocument, editor: TextEditor): DecorationOptions[] {
    let content = doc.getText();

    if (!content.startsWith('#%ATL 1.0')) return null;

    let bat = new Bat({
      raw: content,
      file: doc.fileName,
      loadRaml: false
    });

    return bat.errors.filter(x => x.node).map(error => {
      var startPos = doc.positionAt(error.node.startPosition);
      var endPos = doc.positionAt(error.node.endPosition);
      var decoration = {
        range: new Range(startPos, endPos),
        hoverMessage: error.toString()
      };
      return decoration;
    });
  }

  public dispose() {
    this._statusBarItem.dispose();
  }
}

class WordCounterController {

  private _wordCounter: WordCounter;
  private _disposable: Disposable;

  constructor(wordCounter: WordCounter) {
    this._wordCounter = wordCounter;
    this._wordCounter.updateWordCount();

    // subscribe to selection change and editor activation events
    let subscriptions: Disposable[] = [];
    window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
    window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

    // create a combined disposable from both event subscriptions
    this._disposable = Disposable.from(...subscriptions);
  }

  private _onEvent() {
    this._wordCounter.updateWordCount();
  }

  public dispose() {
    this._disposable.dispose();
  }
}
