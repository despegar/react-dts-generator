import * as fs from 'fs';
import * as prettier from 'prettier';
import {ComponentInfo, parse, resolver} from 'react-docgen';
import * as dom from './dts-dom';
import * as Utils from './utils';

export interface ImportType {
    named?: string;
    default?: string;
    from: string;
}

export interface Extends {
    includePropsAsGeneric?: boolean;
    import: ImportType;
}

export interface Options {
    input: string;
    output: string;
    isBaseClass?: boolean;
    propTypesComposition?: ImportType[];
    extends?: Extends;
    imports?: ImportType[];
}

export function generate(options: Options, findAll?: boolean): string {
    let result: string = '';
    let baseType: string = 'React.FC';

    const {input, output, isBaseClass, propTypesComposition, imports} = options;

    const componentName = input.substring(input.lastIndexOf('/') + 1, input.lastIndexOf('.'));

    const content: string = fs.readFileSync(input, 'utf8');
    const [componentInfo, ...childs] = (<ComponentInfo[]>parse(content, findAll ? resolver.findAllComponentDefinitions : undefined)).sort((a) => (a.displayName === componentName ? -1 : 1));;
    const className = isBaseClass ? Utils.writeGeneric(componentInfo.displayName, 'T = any') : componentInfo.displayName;

    const importDefinitions: dom.Import[] = [];
    const interfaceDefinitions: dom.InterfaceDeclaration[] = [];
    const intersectDefinitions: dom.PropertyDeclaration[] = [];

    if (componentInfo) {
        const propsInterfaceName = `${componentInfo.displayName}Props`;
        const propsDefinition = dom.create.interface(propsInterfaceName, dom.DeclarationFlags.Export);
        const importDefinition = dom.create.importAll('React', 'react');
        const constDefinition = dom.create.const(className, Utils.writeGeneric('React.FC', propsInterfaceName), dom.DeclarationFlags.None);

        importDefinitions.push(importDefinition);

        if (imports && imports.length > 0) {
            imports.forEach(x => {
                importDefinitions.push(Utils.createImport(x.from, x.default, x.named));
            });
        }

        if (componentInfo.props) {
            const props = componentInfo.props;
            const keys = Object.keys(props);

            if (keys.length > 0) {
                keys.forEach(key => {
                    const prop = {...props[key], name: key};
                    if (!prop.type) {
                        return;
                    }

                    const propResult = Utils.generateProp(prop);
                    if (propResult) {
                        const {property, interfaces} = propResult;
                        propsDefinition.members.push(property);
                        if (interfaces && interfaces.length > 0) {
                            interfaceDefinitions.push(...interfaces);
                        }
                    }
                });
            }

            baseType = Utils.writeGeneric('React.FC', isBaseClass ? 'T' : propsInterfaceName);
            interfaceDefinitions.push(propsDefinition);
        }

        if (childs && childs.length > 0) {
            childs.map(({displayName, props}) => {
                const propsIntefaceName2 = `${displayName}Props`;
                const propsDefinition2 = dom.create.interface(propsIntefaceName2, dom.DeclarationFlags.None);
                const importDefinition2 = dom.create.importAll('React', 'react');
                importDefinitions.push(importDefinition2);
                if (imports && imports.length > 0) {
                    imports.forEach(x => {
                        importDefinitions.push(Utils.createImport(x.from, x.default, x.named));
                    });
                }
                if (props) {
                    const keys = Object.keys(props);
                    if (keys.length > 0) {
                        keys.forEach(key => {
                            const prop = {...props[key], name: key};
                            if (!prop.type) {
                                return;
                            }
                            const propResult = Utils.generateProp(prop);
                            if (propResult) {
                                const {property, interfaces} = propResult;
                                propsDefinition2.members.push(property);
                                if (interfaces && interfaces.length > 0) {
                                    interfaceDefinitions.push(...interfaces);
                                }
                            }
                        });
                    }
                    // baseType = Utils.writeGeneric('React.Component', isBaseClass ? 'T' : propsIntefaceName);
                    interfaceDefinitions.push(propsDefinition2);
                    intersectDefinitions.push(dom.create.property(displayName, Utils.writeGeneric('React.FC', propsIntefaceName2)));

                }
            });

        }

        if (propTypesComposition && propTypesComposition.length > 0) {
            propsDefinition.baseTypes = [];
            propTypesComposition.forEach(x => {
                importDefinitions.push(Utils.createImport(x.from, x.default, x.named));
                propsDefinition.baseTypes.push(x.default as string || x.named as string);
            });
        }

        if (options.extends) {
            if (options.extends.import) {
                const {from, named} = options.extends.import;
                importDefinitions.push(Utils.createImport(from, options.extends.import.default, named));
                const baseTypeName = named as string || options.extends.import.default as string;
                const genericName = isBaseClass ? 'T' : propsInterfaceName;
                baseType = Utils.writeGeneric(baseTypeName, genericName);
            }
        }

        /*if (componentInfo.methods) {
            componentInfo.methods.forEach(method => {
                const {params, returns} = method;
                const parameters: dom.Parameter[] = [];
                if (params && params.length > 0) {
                    params.forEach(param => {
                        const type = param.type ? param.type.name : 'any';
                        parameters.push(dom.create.parameter(param.name, Utils.getType(type)));
                    });
                }
                const returnType = returns ? returns.type.name : 'any';
                constDefinition.members.push(dom.create.method(method.name, parameters, Utils.getType(returnType)));
            });
        }*/

        result += dom.emit(dom.create.imports(importDefinitions));
        interfaceDefinitions.forEach(x => result += dom.emit(x));
        constDefinition.type = dom.create.intersection([baseType, dom.create.objectType(intersectDefinitions)]);
        result += dom.emit(constDefinition);
        result += `
export default ${componentInfo.displayName}`;

        if (result) {
            const fileName = output || input.split('.')[0] + '.d.ts';
            result = prettier.format(result, {parser: 'typescript'});
            fs.writeFileSync(fileName, result, {flag: 'w', encoding: 'utf8'});
            return result;
        }
    }

    return '';
}
