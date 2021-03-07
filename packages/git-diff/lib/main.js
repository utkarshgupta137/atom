const GitDiffView = require('./git-diff-view');
const DiffListView = require('./diff-list-view');

let diffListView = null;

module.exports = {
  activate() {
    const watchedEditors = new WeakSet();

    // HACK: Set up test suite data transport layer.
    // TODO: Tear down transport and contained data upon package destruction.
    let transport = document.querySelector('div#test-transport');
    if (transport == null) {
      transport = document.createElement('div');
      transport.id = 'test-transport';
      transport.packageStates = { 'git-diff': new Map() };
      // This element shouldn't render. This will also prevent it from being
      // targeted by users so command subscribers won't be revealed to users.
      transport.style.display = 'none';
      document.body.appendChild(transport);
    }

    atom.workspace.observeTextEditors(editor => {
      if (watchedEditors.has(editor)) {
        return;
      }

      const diffView = new GitDiffView(editor);
      diffView.start();

      atom.commands.add(
        atom.views.getView(editor),
        'git-diff:toggle-diff-list',
        () => {
          if (diffListView == null) {
            diffListView = new DiffListView();
          }
          diffListView.toggle();
        }
      );

      // NOTE: append data into the transport vector.
      transport.packageStates['git-diff'].set(editor, diffView);

      watchedEditors.add(editor);
      editor.onDidDestroy(() => watchedEditors.delete(editor));
    });
  },

  deactivate() {
    if (diffListView) {
      diffListView.destroy();
    }
    diffListView = null;
  }
};
