const path = require('path');
const fs = require('fs-plus');
const temp = require('temp');

describe('GitDiff when targeting nested repository', () => {
  let editor, editorElement, projectPath, targetRepositoryPath;

  beforeEach(() => {
    spyOn(window, 'setImmediate').andCallFake(fn => fn());

    projectPath = temp.mkdirSync('git-diff-spec-');

    fs.copySync(path.join(__dirname, 'fixtures'), projectPath);
    fs.moveSync(
      path.join(projectPath, 'working-dir', 'git.git'),
      path.join(projectPath, 'working-dir', '.git')
    );

    // The nested repo doesn't need to be managed by the temp module because
    // it's a part of our test environment.
    const nestedPath = path.join(projectPath, 'nested-repository');
    // When instantiating a GitRepository, the repository will always point
    // to the .git folder in it's path.
    targetRepositoryPath = path.join(nestedPath, 'working-dir', '.git');
    // Initialize the repository contents.
    fs.copySync(path.join(__dirname, 'fixtures'), nestedPath);
    fs.moveSync(
      path.join(nestedPath, 'working-dir', 'git.git'),
      path.join(nestedPath, 'working-dir', '.git')
    );

    atom.project.setPaths([projectPath]);

    jasmine.attachToDOM(atom.workspace.getElement());

    waitsForPromise(() =>
      // Make sure we open the child repository's contents, and not the
      // file in the parent repository.
      atom.workspace.open(path.join(nestedPath, 'working-dir', 'sample.js'))
    );

    runs(() => {
      editor = atom.workspace.getActiveTextEditor();
      editorElement = editor.getElement();
    });

    waitsForPromise(() => atom.packages.activatePackage('git-diff'));
    waits(100);
  });

  describe('when the editor has modified lines in nested repository', () => {
    it('highlights the modified lines for the nested repo', () => {
      expect(editorElement.querySelectorAll('.git-line-modified').length).toBe(
        0
      );
      editor.insertText('a');
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      expect(editorElement.querySelectorAll('.git-line-modified').length).toBe(
        1
      );
      expect(editorElement.querySelector('.git-line-modified')).toHaveData(
        'buffer-row',
        0
      );
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });

  describe('when the editor has added lines in the nested repository', () => {
    it('highlights the added lines for the nested repository contents', () => {
      expect(editorElement.querySelectorAll('.git-line-added').length).toBe(0);
      editor.moveToEndOfLine();
      editor.insertNewline();
      editor.insertText('a');
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      expect(editorElement.querySelectorAll('.git-line-added').length).toBe(1);
      expect(editorElement.querySelector('.git-line-added')).toHaveData(
        'buffer-row',
        1
      );
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });

  describe('when the editor has removed lines in the nested repository', () => {
    it('highlights the line preceeding the deleted lines', () => {
      expect(editorElement.querySelectorAll('.git-line-added').length).toBe(0);
      editor.setCursorBufferPosition([5]);
      editor.deleteLine();
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      expect(editorElement.querySelectorAll('.git-line-removed').length).toBe(
        1
      );
      expect(editorElement.querySelector('.git-line-removed')).toHaveData(
        'buffer-row',
        4
      );
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });

  describe('when the editor has removed the first line of a nested repo', () => {
    it('highlights the line preceeding the deleted lines', () => {
      expect(editorElement.querySelectorAll('.git-line-added').length).toBe(0);
      editor.setCursorBufferPosition([0, 0]);
      editor.deleteLine();
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      expect(
        editorElement.querySelectorAll('.git-previous-line-removed').length
      ).toBe(1);
      expect(
        editorElement.querySelector('.git-previous-line-removed')
      ).toHaveData('buffer-row', 0);
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });

  describe('when a modified line is restored to the HEAD version contents', () => {
    it('removes the diff highlight', () => {
      expect(editorElement.querySelectorAll('.git-line-modified').length).toBe(
        0
      );
      editor.insertText('a');
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      expect(editorElement.querySelectorAll('.git-line-modified').length).toBe(
        1
      );
      editor.backspace();
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      expect(editorElement.querySelectorAll('.git-line-modified').length).toBe(
        0
      );
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });

  describe('when a modified file is opened in a nested repository', () => {
    it('highlights the changed lines', () => {
      fs.writeFileSync(
        path.join(projectPath, 'working-dir', 'sample.txt'),
        'Some different text.'
      );
      let nextTick = false;

      waitsForPromise(() =>
        atom.workspace.open(path.join(projectPath, 'working-dir', 'sample.txt'))
      );
      waits(100);

      runs(() => {
        editorElement = atom.workspace.getActiveTextEditor().getElement();
      });

      setImmediate(() => {
        nextTick = true;
      });

      waitsFor(() => nextTick);

      runs(() => {
        expect(
          editorElement.querySelectorAll('.git-line-modified').length
        ).toBe(1);
        expect(editorElement.querySelector('.git-line-modified')).toHaveData(
          'buffer-row',
          0
        );
        expect(
          document
            .querySelector('div#test-transport')
            .packageStates['git-diff'].get(editor)
            .repository.getPath()
        ).toBe(targetRepositoryPath);
      });
    });
  });

  describe('when the project paths change for a nested repository', () => {
    it("doesn't try to use the destroyed git repository", () => {
      editor.deleteLine();
      atom.project.setPaths([temp.mkdirSync('no-repository')]);
      advanceClock(editor.getBuffer().stoppedChangingDelay);
      // I just realized this test didn't really check what it was supposed to.
      // hopefully this makes it viable.
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });

  describe('move-to-next-diff/move-to-previous-diff events', () => {
    it('moves the cursor to first character of the next/previous diff line', () => {
      editor.insertText('a');
      editor.setCursorBufferPosition([5]);
      editor.deleteLine();
      advanceClock(editor.getBuffer().stoppedChangingDelay);

      editor.setCursorBufferPosition([0]);
      atom.commands.dispatch(editorElement, 'git-diff:move-to-next-diff');
      expect(editor.getCursorBufferPosition()).toEqual([4, 4]);

      atom.commands.dispatch(editorElement, 'git-diff:move-to-previous-diff');
      expect(editor.getCursorBufferPosition()).toEqual([0, 0]);
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });

    it('wraps around to the first/last diff in the file', () => {
      editor.insertText('a');
      editor.setCursorBufferPosition([5]);
      editor.deleteLine();
      advanceClock(editor.getBuffer().stoppedChangingDelay);

      editor.setCursorBufferPosition([0]);
      atom.commands.dispatch(editorElement, 'git-diff:move-to-next-diff');
      expect(editor.getCursorBufferPosition()).toEqual([4, 4]);

      atom.commands.dispatch(editorElement, 'git-diff:move-to-next-diff');
      expect(editor.getCursorBufferPosition()).toEqual([0, 0]);

      atom.commands.dispatch(editorElement, 'git-diff:move-to-previous-diff');
      expect(editor.getCursorBufferPosition()).toEqual([4, 4]);
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });

    describe('when the wrapAroundOnMoveToDiff config option is false', () => {
      beforeEach(() =>
        atom.config.set('git-diff.wrapAroundOnMoveToDiff', false)
      );

      it('does not wraps around to the first/last diff in the file', () => {
        editor.insertText('a');
        editor.setCursorBufferPosition([5]);
        editor.deleteLine();
        advanceClock(editor.getBuffer().stoppedChangingDelay);

        editor.setCursorBufferPosition([0]);
        atom.commands.dispatch(editorElement, 'git-diff:move-to-next-diff');
        expect(editor.getCursorBufferPosition()).toEqual([4, 4]);

        atom.commands.dispatch(editorElement, 'git-diff:move-to-next-diff');
        expect(editor.getCursorBufferPosition()).toEqual([4, 4]);

        atom.commands.dispatch(editorElement, 'git-diff:move-to-previous-diff');
        expect(editor.getCursorBufferPosition()).toEqual([0, 0]);

        atom.commands.dispatch(editorElement, 'git-diff:move-to-previous-diff');
        expect(editor.getCursorBufferPosition()).toEqual([0, 0]);
        expect(
          document
            .querySelector('div#test-transport')
            .packageStates['git-diff'].get(editor)
            .repository.getPath()
        ).toBe(targetRepositoryPath);
      });
    });
  });

  describe('when the showIconsInEditorGutter config option is true', () => {
    beforeEach(() => {
      atom.config.set('git-diff.showIconsInEditorGutter', true);
    });

    it('the gutter has a git-diff-icon class', () => {
      expect(editorElement.querySelector('.gutter')).toHaveClass(
        'git-diff-icon'
      );
      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });

    it('keeps the git-diff-icon class when editor.showLineNumbers is toggled', () => {
      atom.config.set('editor.showLineNumbers', false);
      expect(editorElement.querySelector('.gutter')).not.toHaveClass(
        'git-diff-icon'
      );

      atom.config.set('editor.showLineNumbers', true);
      expect(editorElement.querySelector('.gutter')).toHaveClass(
        'git-diff-icon'
      );

      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });

    it('removes the git-diff-icon class when the showIconsInEditorGutter config option set to false', () => {
      atom.config.set('git-diff.showIconsInEditorGutter', false);
      expect(editorElement.querySelector('.gutter')).not.toHaveClass(
        'git-diff-icon'
      );

      expect(
        document
          .querySelector('div#test-transport')
          .packageStates['git-diff'].get(editor)
          .repository.getPath()
      ).toBe(targetRepositoryPath);
    });
  });
});
