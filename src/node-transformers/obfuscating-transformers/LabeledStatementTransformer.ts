import { injectable, inject } from 'inversify';
import { ServiceIdentifiers } from '../../container/ServiceIdentifiers';

import * as estraverse from 'estraverse';
import * as ESTree from 'estree';

import { IOptions } from '../../interfaces/options/IOptions';
import { IObfuscationReplacer } from '../../interfaces/node-transformers/IObfuscationReplacer';
import { IObfuscationReplacerWithStorage } from '../../interfaces/node-transformers/IObfuscationReplacerWithStorage';

import { NodeObfuscatorsReplacers } from '../../enums/container/NodeObfuscationReplacers';

import { AbstractNodeTransformer } from '../AbstractNodeTransformer';
import { Node } from '../../node/Node';

/**
 * replaces:
 *     label: {
 *          for (var i = 0; i < 1000; i++) {
 *              break label;
 *          }
 *     }
 *
 * on:
 *     _0x12d45f: {
 *          for (var i = 0; i < 1000; i++) {
 *              break _0x12d45f;
 *          }
 *     }
 *
 */
@injectable()
export class LabeledStatementTransformer extends AbstractNodeTransformer {
    /**
     * @type {IObfuscationReplacerWithStorage}
     */
    private readonly identifierReplacer: IObfuscationReplacerWithStorage;

    /**
     * @param nodeObfuscatorsReplacersFactory
     * @param options
     */
    constructor (
        @inject(ServiceIdentifiers.Factory__IObfuscatorReplacer) nodeObfuscatorsReplacersFactory: (replacer: NodeObfuscatorsReplacers) => IObfuscationReplacer,
        @inject(ServiceIdentifiers.IOptions) options: IOptions
    ) {
        super(options);

        this.identifierReplacer = <IObfuscationReplacerWithStorage>nodeObfuscatorsReplacersFactory(NodeObfuscatorsReplacers.IdentifierReplacer);
    }

    /**
     * @param labeledStatementNode
     * @returns {ESTree.Node}
     */
    public transformNode (labeledStatementNode: ESTree.LabeledStatement): ESTree.Node {
        const nodeIdentifier: number = this.nodeIdentifier++;

        this.storeLabeledStatementName(labeledStatementNode, nodeIdentifier);
        this.replaceLabeledStatementName(labeledStatementNode, nodeIdentifier);

        return labeledStatementNode;
    }

    /**
     * @param labeledStatementNode
     * @param nodeIdentifier
     */
    private storeLabeledStatementName (labeledStatementNode: ESTree.LabeledStatement, nodeIdentifier: number): void {
        this.identifierReplacer.storeNames(labeledStatementNode.label.name, nodeIdentifier);
    }

    /**
     * @param labeledStatementNode
     * @param nodeIdentifier
     */
    private replaceLabeledStatementName (labeledStatementNode: ESTree.LabeledStatement, nodeIdentifier: number): void {
        estraverse.replace(labeledStatementNode, {
            enter: (node: ESTree.Node, parentNode: ESTree.Node): any => {
                if (Node.isLabelIdentifierNode(node, parentNode)) {
                    node.name = this.identifierReplacer.replace(node.name, nodeIdentifier);
                }
            }
        });
    }
}
