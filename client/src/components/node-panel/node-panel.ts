import { Component, Vue } from 'vue-property-decorator';
import $ from 'jquery';

import ns from '@/store/namespaces';
import { NodeType, CreateNodeOptions } from '@/store/dataflow/types';
import { elementContains } from '@/common/util';
import { DRAG_TIME_THRESHOLD } from '@/common/constants';

const NODE_TYPES_PER_ROW = 2;

@Component
export default class NodePanel extends Vue {
  @ns.panels.State('nodePanelVisible') private visible!: boolean;
  @ns.dataflow.State('nodeTypes') private nodeTypes!: NodeType[];
  @ns.dataflow.Mutation('createNode') private createNode!: (options: CreateNodeOptions) => void;

  /** Initializes the drag-and-drop behavior on the node buttons. */
  private initDrag() {
    const clickHandler = (nodeType: NodeType) => {
      this.createNode({
        type: nodeType.id,
        centerX: Math.floor(window.innerWidth * .5),
        centerY: Math.floor(window.innerHeight * .45),
      });
    };

    this.nodeTypes.forEach((nodeType: NodeType) => {
      const button = $(this.$el).find(`#${nodeType.id}`);
      let startTime: Date;
      button.draggable({
        helper: 'clone',
        start: (evt: Event) => {
          startTime = new Date();
        },
        stop: (evt: Event) => {
          const x = (evt as MouseEvent).pageX;
          const y = (evt as MouseEvent).pageY;
          if (new Date().getTime() - startTime.getTime() <= DRAG_TIME_THRESHOLD) {
            // If mouse is released soon after pressing down, we consider it a click.
            clickHandler(nodeType);
            return;
          }
          if (elementContains(this.$el, x, y)) {
            // If the button is dropped on the node panel, do nothing so as to cancel the drag.
            return;
          }
          this.createNode({
            type: nodeType.id,
            centerX: Math.floor(x),
            centerY: Math.floor(y),
          });
        },
      });
      // If the button is clicked instead of dragged, create the node near the center of the screen.
      button.click(() => clickHandler(nodeType));
    });
  }

  private mounted() {
    // Inits the drag behavior on node type buttons when the node panel is mounted.
    this.initDrag();
  }

  get nodeTypeRows(): NodeType[][] {
    const rows: NodeType[][] = [];
    let i = 0;
    while (i < this.nodeTypes.length) {
      rows.push(this.nodeTypes.slice(i, i + NODE_TYPES_PER_ROW));
      i += NODE_TYPES_PER_ROW;
    }
    return rows;
  }
}