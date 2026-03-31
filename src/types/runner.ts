export type Language = 'python' | 'ruby' | 'c' | 'cpp'

export interface LanguageMeta {
  label: string
  monacoId: string
  fileExt: string
  defaultCode: string
  /** true = interactive input() modal (Python only) */
  interactiveInput: boolean
  /** true = uses wasm-clang (C/C++) */
  isClang?: boolean
}

export const LANGUAGES: Record<Language, LanguageMeta> = {
  python: {
    label: 'Python',
    monacoId: 'python',
    fileExt: 'py',
    interactiveInput: false,
    defaultCode: `# Python — powered by Pyodide (WASM)
name = input("What's your name? ")
print(f"Hello, {name}!")

for i in range(5):
    print(f"  {i + 1}. {'⭐' * (i + 1)}")

import sys
print(f"\\nPython {sys.version.split()[0]}")
`,
  },

  ruby: {
    label: 'Ruby',
    monacoId: 'ruby',
    fileExt: 'rb',
    interactiveInput: false,
    defaultCode: `# Ruby — powered by ruby.wasm
name = gets.chomp
puts "Hello, #{name}!"

5.times do |i|
  puts "  #{i + 1}. #{'⭐' * (i + 1)}"
end

puts "\\nRuby #{RUBY_VERSION}"
`,
  },

  c: {
    label: 'C',
    monacoId: 'c',
    fileExt: 'c',
    interactiveInput: false,
    isClang: true,
    defaultCode: `#include <stdio.h>
#include <string.h>

int main() {
    char name[128];
    fgets(name, sizeof(name), stdin);
    name[strcspn(name, "\\n")] = 0;  /* strip newline */

    printf("Hello, %s!\\n", name);

    for (int i = 1; i <= 5; i++) {
        printf("  %d. ", i);
        for (int j = 0; j < i; j++) printf("*");
        printf("\\n");
    }
    return 0;
}
`,
  },

  cpp: {
    label: 'C++',
    monacoId: 'cpp',
    fileExt: 'cpp',
    interactiveInput: false,
    isClang: true,
    defaultCode: `#include <iostream>
#include <string>

int main() {
    std::string name;
    std::getline(std::cin, name);
    std::cout << "Hello, " << name << "!\\n";

    for (int i = 1; i <= 5; i++) {
        std::cout << "  " << i << ". ";
        for (int j = 0; j < i; j++) std::cout << "*";
        std::cout << "\\n";
    }

    std::cout << "\\nC++17 via wasm-clang\\n";
    return 0;
}
`,
  },
}
