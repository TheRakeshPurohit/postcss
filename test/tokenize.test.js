let { test } = require('uvu')
let { equal, is, throws } = require('uvu/assert')

let { Input } = require('../lib/postcss')
let tokenizer = require('../lib/tokenize')

function tokenize(css, opts) {
  let processor = tokenizer(new Input(css), opts)
  let tokens = []
  while (!processor.endOfFile()) {
    tokens.push(processor.nextToken())
  }
  return tokens
}

function run(css, tokens, opts) {
  equal(tokenize(css, opts), tokens)
}

test('tokenizes empty file', () => {
  run('', [])
})

test('tokenizes space', () => {
  run('\r\n \f\t', [['space', '\r\n \f\t']])
})

test('tokenizes word', () => {
  run('ab', [['word', 'ab', 0, 1]])
})

test('splits word by !', () => {
  run('aa!bb', [
    ['word', 'aa', 0, 1],
    ['word', '!bb', 2, 4]
  ])
})

test('changes lines in spaces', () => {
  run('a \n b', [
    ['word', 'a', 0, 0],
    ['space', ' \n '],
    ['word', 'b', 4, 4]
  ])
})

test('tokenizes control chars', () => {
  run('{:;}', [
    ['{', '{', 0],
    [':', ':', 1],
    [';', ';', 2],
    ['}', '}', 3]
  ])
})

test('escapes control symbols', () => {
  run('\\(\\{\\"\\@\\\\""', [
    ['word', '\\(', 0, 1],
    ['word', '\\{', 2, 3],
    ['word', '\\"', 4, 5],
    ['word', '\\@', 6, 7],
    ['word', '\\\\', 8, 9],
    ['string', '""', 10, 11]
  ])
})

test('escapes backslash', () => {
  run('\\\\\\\\{', [
    ['word', '\\\\\\\\', 0, 3],
    ['{', '{', 4]
  ])
})

test('tokenizes simple brackets', () => {
  run('(ab)', [['brackets', '(ab)', 0, 3]])
})

test('tokenizes square brackets', () => {
  run('a[bc]', [
    ['word', 'a', 0, 0],
    ['[', '[', 1],
    ['word', 'bc', 2, 3],
    [']', ']', 4]
  ])
})

test('tokenizes complicated brackets', () => {
  run('(())("")(/**/)(\\\\)(\n)(', [
    ['(', '(', 0],
    ['brackets', '()', 1, 2],
    [')', ')', 3],
    ['(', '(', 4],
    ['string', '""', 5, 6],
    [')', ')', 7],
    ['(', '(', 8],
    ['comment', '/**/', 9, 12],
    [')', ')', 13],
    ['(', '(', 14],
    ['word', '\\\\', 15, 16],
    [')', ')', 17],
    ['(', '(', 18],
    ['space', '\n'],
    [')', ')', 20],
    ['(', '(', 21]
  ])
})

test('tokenizes string', () => {
  run('\'"\'"\\""', [
    ['string', "'\"'", 0, 2],
    ['string', '"\\""', 3, 6]
  ])
})

test('tokenizes escaped string', () => {
  run('"\\\\"', [['string', '"\\\\"', 0, 3]])
})

test('changes lines in strings', () => {
  run('"\n\n""\n\n"', [
    ['string', '"\n\n"', 0, 3],
    ['string', '"\n\n"', 4, 7]
  ])
})

test('tokenizes at-word', () => {
  run('@word ', [
    ['at-word', '@word', 0, 4],
    ['space', ' ']
  ])
})

test('tokenizes at-word end', () => {
  run('@one{@two()@three""@four;', [
    ['at-word', '@one', 0, 3],
    ['{', '{', 4],
    ['at-word', '@two', 5, 8],
    ['brackets', '()', 9, 10],
    ['at-word', '@three', 11, 16],
    ['string', '""', 17, 18],
    ['at-word', '@four', 19, 23],
    [';', ';', 24]
  ])
})

test('tokenizes urls', () => {
  run('url(/*\\))', [
    ['word', 'url', 0, 2],
    ['brackets', '(/*\\))', 3, 8]
  ])
})

test('tokenizes quoted urls', () => {
  run('url(")")', [
    ['word', 'url', 0, 2],
    ['(', '(', 3],
    ['string', '")"', 4, 6],
    [')', ')', 7]
  ])
})

test('tokenizes at-symbol', () => {
  run('@', [['at-word', '@', 0, 0]])
})

test('tokenizes comment', () => {
  run('/* a\nb */', [['comment', '/* a\nb */', 0, 8]])
})

test('changes lines in comments', () => {
  run('a/* \n */b', [
    ['word', 'a', 0, 0],
    ['comment', '/* \n */', 1, 7],
    ['word', 'b', 8, 8]
  ])
})

test('supports line feed', () => {
  run('a\fb', [
    ['word', 'a', 0, 0],
    ['space', '\f'],
    ['word', 'b', 2, 2]
  ])
})

test('supports carriage return', () => {
  run('a\rb\r\nc', [
    ['word', 'a', 0, 0],
    ['space', '\r'],
    ['word', 'b', 2, 2],
    ['space', '\r\n'],
    ['word', 'c', 5, 5]
  ])
})

test('tokenizes CSS', () => {
  let css =
    'a {\n' +
    '  content: "a";\n' +
    '  width: calc(1px;)\n' +
    '  }\n' +
    '/* small screen */\n' +
    '@media screen {}'
  run(css, [
    ['word', 'a', 0, 0],
    ['space', ' '],
    ['{', '{', 2],
    ['space', '\n  '],
    ['word', 'content', 6, 12],
    [':', ':', 13],
    ['space', ' '],
    ['string', '"a"', 15, 17],
    [';', ';', 18],
    ['space', '\n  '],
    ['word', 'width', 22, 26],
    [':', ':', 27],
    ['space', ' '],
    ['word', 'calc', 29, 32],
    ['brackets', '(1px;)', 33, 38],
    ['space', '\n  '],
    ['}', '}', 42],
    ['space', '\n'],
    ['comment', '/* small screen */', 44, 61],
    ['space', '\n'],
    ['at-word', '@media', 63, 68],
    ['space', ' '],
    ['word', 'screen', 70, 75],
    ['space', ' '],
    ['{', '{', 77],
    ['}', '}', 78]
  ])
})

test('throws error on unclosed string', () => {
  throws(() => {
    tokenize(' "')
  }, /:1:2: Unclosed string/)
})

test('throws error on unclosed comment', () => {
  throws(() => {
    tokenize(' /*')
  }, /:1:2: Unclosed comment/)
})

test('throws error on unclosed url', () => {
  throws(() => {
    tokenize('url(')
  }, /:1:4: Unclosed bracket/)
})

test('ignores unclosing string on request', () => {
  run(
    ' "',
    [
      ['space', ' '],
      ['string', '"', 1, 2]
    ],
    { ignoreErrors: true }
  )
})

test('ignores unclosing comment on request', () => {
  run(
    ' /*',
    [
      ['space', ' '],
      ['comment', '/*', 1, 3]
    ],
    { ignoreErrors: true }
  )
})

test('ignores unclosing function on request', () => {
  run(
    'url(',
    [
      ['word', 'url', 0, 2],
      ['brackets', '(', 3, 3]
    ],
    { ignoreErrors: true }
  )
})

test('tokenizes hexadecimal escape', () => {
  run('\\0a \\09 \\z ', [
    ['word', '\\0a ', 0, 3],
    ['word', '\\09 ', 4, 7],
    ['word', '\\z', 8, 9],
    ['space', ' ']
  ])
})

test('ignore unclosed per token request', () => {
  function token(css, opts) {
    let processor = tokenizer(new Input(css), opts)
    let tokens = []
    while (!processor.endOfFile()) {
      tokens.push(processor.nextToken({ ignoreUnclosed: true }))
    }
    return tokens
  }

  let css = "How's it going ("
  let tokens = token(css, {})
  let expected = [
    ['word', 'How', 0, 2],
    ['string', "'s", 3, 4],
    ['space', ' '],
    ['word', 'it', 6, 7],
    ['space', ' '],
    ['word', 'going', 9, 13],
    ['space', ' '],
    ['(', '(', 15]
  ]

  equal(tokens, expected)
})

test('provides correct position', () => {
  let css = 'Three tokens'
  let processor = tokenizer(new Input(css))
  is(processor.position(), 0)
  processor.nextToken()
  is(processor.position(), 5)
  processor.nextToken()
  is(processor.position(), 6)
  processor.nextToken()
  is(processor.position(), 12)
  processor.nextToken()
  is(processor.position(), 12)
})

test.run()
