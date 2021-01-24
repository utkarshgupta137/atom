const { Directory } = require('atom');

const repositoryForPath = async path => {
  if (path) {
    return atom.project.repositoryForDirectory(new Directory(path));
  }
  return null;
};

module.exports = { repositoryForPath };
