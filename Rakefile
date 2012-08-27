require 'fileutils'

$ATOM_ARGS = []

ENV['PATH'] = "#{ENV['PATH']}:/usr/local/bin/"
BUILD_DIR = 'atom-build'
mkdir_p BUILD_DIR

desc "Build Atom via `xcodebuild`"
task :build => :"verify-prerequisites" do
  output = `xcodebuild -scheme atom-release SYMROOT=#{BUILD_DIR}`
  if $?.exitstatus != 0
    $stderr.puts "Error #{$?.exitstatus}:\n#{output}"
    exit($?.exitstatus)
  end
end

desc "Clean build Atom via `xcodebuild`"
task :clean do
  output = `xcodebuild clean SYMROOT=#{BUILD_DIR}`
  rm_rf BUILD_DIR
end

desc "Create the Atom.app for distribution"
task :package => :build do
  if path = application_path()
    FileUtils.rm_rf "pkg"
    FileUtils.mkdir_p "pkg"
    FileUtils.cp_r path, "pkg/"
    `cd pkg && zip -r atom.zip .`
  else
    exit(1)
  end
end

desc "Run Atom"
task :run => :build do
  if path = binary_path()
    exitstatus = system "#{path} #{$ATOM_ARGS.join(' ')} 2> /dev/null"
    exit(exitstatus)
  else
    exit(1)
  end
end

desc "Run the specs"
task :test => :clean do
  $ATOM_ARGS.push "--test", "--headless"
  Rake::Task["run"].invoke
end

desc "Run the benchmarks"
task :benchmark do
  $ATOM_ARGS.push "--benchmark", "--headless"
  Rake::Task["run"].invoke
end

desc "Copy files to bundle and compile CoffeeScripts"
task :"copy-files-to-bundle" => :"verify-prerequisites" do
  project_dir  = ENV['PROJECT_DIR'] || '.'
  built_dir    = ENV['BUILT_PRODUCTS_DIR'] || '.'
  contents_dir = ENV['CONTENTS_FOLDER_PATH'].to_s

  dest = File.join(built_dir, contents_dir, "Resources")

  if resource_path = ENV['RESOURCE_PATH']
    sh "coffee -c -o #{dest}/src/stdlib #{resource_path}/src/stdlib/require.coffee"
    cp_r "#{resource_path}/static", dest
    cp "#{resource_path}/src/stdlib/onig-reg-exp-extension.js", "#{dest}/src/stdlib"
    cp "#{resource_path}/src/stdlib/native-handler.js", "#{dest}/src/stdlib"
  else
    # TODO: Restore this list when we add in all of atoms source
    #%w(src static vendor spec benchmark bundles themes).each do |dir|
    %w(src static vendor).each do |dir|
      dest_path = File.join(dest, dir)
      rm_rf dest_path
      cp_r dir, dest_path
      sh "coffee -c #{dest_path}"
    end
  end
end

desc "Remove any 'fit' or 'fdescribe' focus directives from the specs"
task :nof do
  system %{find . -name *spec.coffee | xargs sed -E -i "" "s/f+(it|describe) +(['\\"])/\\1 \\2/g"}
end

task :"verify-prerequisites" do
  `hash coffee`
  if not $?.success?
    abort "error: coffee is required but it's not installed - " +
          "http://coffeescript.org/ - (try `npm i -g coffee-script`)"
  end
end

def application_path
  applications = FileList["#{BUILD_DIR}/**/Atom.app"]
  if applications.size == 0
    $stderr.puts "No Atom application found in directory `#{BUILD_DIR}`"
  elsif applications.size > 1
    $stderr.puts "Multiple Atom applications found \n\t" + applications.join("\n\t")
  else
    return applications.first
  end

  return nil
end

def binary_path
  if app_path = application_path()
    binary_path = "#{app_path}/Contents/MacOS/Atom"
    if File.exists?(binary_path)
      return binary_path
    else
      $stderr.puts "Executable `#{app_path}` not found."
    end
  end

  return nil
end


