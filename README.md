# react-dts-generator 

This module creates typescript definitons for the react components.

## Installation

```sh
## npm
npm install react-dts-generator --save
##yarn
yarn add react-dts-generator
```


## Usage

```js
import { generate } from 'react-dts-generator';
const string = generate(options);
```

### Options

#### `input: string`

The `.js` file that contains React Component. `react-dts-generator` use the [`react-docgen`](https://github.com/reactjs/react-docgen) library to generate props and methods. The input file format guideline:

- Modules have to export a single component, and only that component is analyzed.
- When using `React.createClass`, the component definition (the value passed to it) must resolve to an object literal.
- When using classes, the class must either `extend React.Component` _or_ define a `render()` method.
- `propTypes` must be an object literal or resolve to an object literal in the same file.
- The `return` statement in `getDefaultProps` must contain an object literal.

#### `output: string`

The `.d.ts` file that contains typescript definitions. If not specified output file will be exported to the same location of the input file.

#### `propTypesComposition: array`

If the component propTypes has composes by another component's propTypes, and typescript definitions of the other component were already generated they could be imported and generated types extend from them.

```js
		const result = generate({
			input: path.join(__dirname, '..', '..', 'baselines', 'compose', 'module.js'),
			output: path.join(__dirname, 'tmp', 'compose', 'module.d.ts'),
			propTypesComposition: [{
				named: 'BasicComponentProps',
				from: '../basic/basic',
			},
			{
				named: 'ComponentBaseProps',
				from: '@kuveytturk/boa-base/ComponentBase',
			}],

		});
```
