# Internationalization conventions

## Goal

Keep translations boring and out of the way. The job of i18n in this project is
to display the right string in the right language — nothing more. Anything that
turns it into a framework, a typing puzzle, or a styling layer is a smell.

## Stack

- **i18next** as the runtime (singleton, peer-dependency-shared with the client app).
- client app may use simple-circuit-engine localization under namespace **sce:**.

## The four rules

Four rules, in order of how often they save pain. These exist because each one
addresses a real failure mode I've seen in i18n codebases. If a rule isn't
solving a real problem here, it shouldn't be added.

### 1. Keys describe *where the string is used*, not *what it looks like*

Good: `about.button`, `about.title`, `nav.circuit-picker.label`
Bad:  `about-short`, `about-long`, `about-bold`, `about-uppercase`

Length and styling vary by language. Context doesn't. A button is a button in
every locale; whether the text is short or long is the translator's call.

### 2. Translation values are stored exactly as they should appear

Including capitalization, punctuation, accents, spacing, and quote marks. No
runtime `capitalize`, `toLowerCase`, `titleCase`, or "first letter uppercase"
transforms on translated text. Capitalization rules differ by language and the
translator owns them.

The single exception: **purely visual uppercasing tied to design system
choices** (e.g. all primary buttons are uppercase) belongs in **CSS**
(`text-transform: uppercase`), never in code or in keys. CSS lets a translator
override per-language if needed; code transforms don't.

### 3. One concept = one key. Never reuse, never concatenate.

If two places happen to display the same English word, they still get two keys.
They will diverge in another language — guaranteed.

Never build a sentence by gluing translated fragments together in code:

```ts
// NEVER
t('you-have') + ' ' + count + ' ' + t('messages')

// Always
t('inbox.summary', { count })   // "You have {{count}} messages"
```

Word order, agreement, and pluralization are the translator's job. Give them
one key with interpolation slots and let them rewrite the whole sentence.

### 4. English is the canonical key set

`en.json` defines the contract. Other locales mirror it exactly. Missing keys
silently fall back to English (i18next default); extra keys in another locale
are dead weight and should be removed.

## Things this doc deliberately does **not** legislate

A list of *non-rules* — places where I considered adding a convention and chose
not to, because the cost would outweigh the benefit at this project's size.

- **No mandated key style** beyond "describe the place". Use dots for nesting,
  hyphens or camelCase inside a segment — whichever reads best in context. The
  goal is grep-ability, not orthography.
- **No required nesting depth.** Flat is fine when there are few keys; nest
  when a group of related strings starts to get noisy. Don't refactor for
  symmetry.
- **No type-safe key generation** (e.g. codegen of a `Keys` enum). Not yet.
  Adds tooling, slows iteration, and pays off only past a few hundred keys.
  Revisit when we have evidence we need it.
- **No translation key catalog tooling** (Lokalise, Crowdin, etc.). Two
  languages and a couple dozen keys is a JSON-file problem, not a SaaS problem.
- **No HTML in translation strings.** No `<b>`, no `<a>`. If a sentence needs
  rich formatting, split it across spans in the HTML and translate each piece
  separately, or accept that the visual effect lives in CSS, not in the string.
- **No ICU MessageFormat** unless we hit a real plural/select case that
  i18next's built-in suffixes (`_one`, `_other`) can't handle. ICU is powerful
  and a tax on every key author; don't pay the tax pre-emptively.

## Adding a translated element

1. Give the element an `id` in `demo/index.html`.
2. Add an entry to `BINDINGS` in `demo/internationalize.ts`:
   ```ts
   ['my-element-id', 'my.key'],
   ```
3. Add the key to `demo/locales/en.json` and `demo/locales/fr.json` with the
   string written exactly as it should appear.

That's the whole loop. If it ever gets longer than three steps, the convention
has grown a barnacle and we should scrape it off.

## Using library strings in the demo

The library's keys live in the `sce` namespace. To bind a demo element to a
library string, prefix the key:

```ts
['some-id', 'sce:components.inverter.name']
```

i18next routes the namespace automatically. No extra wiring.

## Why so few rules?

Because the alternative — rules for nesting depth, key casing, file layout,
fallback behavior, type-safe key constants, lint rules to enforce all of the
above — turns a five-minute "add a button label" task into a fifteen-minute
"navigate the i18n framework" task. Multiplied across a project's lifetime,
that overhead is far worse than the occasional inconsistency the rules were
supposed to prevent.

When in doubt: the convention is "make the string appear correctly in both
languages". That's it. Add a rule only when you can name the specific bug it
prevents.
