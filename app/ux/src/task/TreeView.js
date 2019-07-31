/**
 * Copyright 2019 Abstrium SAS
 * 
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { GroupedList, GroupHeader } from 'office-ui-fabric-react/lib/components/GroupedList/index';
import { FocusZone } from 'office-ui-fabric-react/lib/FocusZone';
import { Selection, SelectionMode, SelectionZone } from 'office-ui-fabric-react/lib/utilities/selection/index';
import {TreeNode, Loader} from "../models/TreeNode";

export default class TreeView extends React.Component {

    constructor(props) {
        super(props);
        const loader = new Loader(props.uri);
        const {initialSelection} = this.props;
        const selection = new Selection({onSelectionChanged:()=>{
            this.setState({selection: selection}, () => {
                const selectedPaths = this.filterSelection();
                if(selectedPaths.indexOf(initialSelection) > -1){
                    this.setState({initialSelectionPath: null});
                }
                this.props.onSelectionChanged(selectedPaths);
            });
        }});
        const tree = new TreeNode("/", loader, null, ()=>{
            let items = [], groups = [];
            this.nodesToGroups(items, groups, tree);
            const {selection, initialSelectionPath} = this.state;
            const crtSel = selection.getSelection();
            selection.setItems(items);
            if(initialSelectionPath !== '' && crtSel.length === 0) {
                for (let i = 0; i < items.length; i++) {
                    if (initialSelectionPath === '/' + items[i].key) {
                        selection.setIndexSelected(i, true, true);
                    }
                }
            }
            crtSel.forEach(s => {
                selection.setKeySelected(s.key, true, true);
            });
            setTimeout(() => {this.forceUpdate()}, 0);
        });
        this.state = {
            tree,
            items:[],
            groups:[], selection, initialSelectionPath: initialSelection};
        selection.setItems([]);
    }

    nodesToGroups(items, groups, node, level = 0, startIndex = 0) {
        items.push({key:node.getPath(), name:node.getPath()});
        let totalChildren = 0;
        node.walk(()=>{totalChildren++});
        const group = {
            count: totalChildren,
            key: node.getPath(),
            name: node.getName(),
            startIndex: startIndex,
            level: level,
            node: node,
            isCollapsed: node.isCollapsed(),
            children: []
        };
        groups.push(group);
        node.getChildren().forEach(child => {
            startIndex = this.nodesToGroups(items, group.children, child, level + 1, startIndex + 1);
        });
        return startIndex
    }

    filterSelection(){
        const {selection} = this.state;
        if(selection.isIndexSelected(0)){
            selection.setAllSelected(false);
            this.forceUpdate();
        }
        const selected = selection.getSelection() || [];
        //console.log(selected);
        return selected.map(item => {
            let k = item.key;
            if(k.length && k[0] !== '/') {
                k = '/' + k;
            }
            return k;
        });
    }


    componentDidMount(){
        const {tree} = this.state;
        const {initialSelection, onError} = this.props;
        onError(null);
        tree.load(initialSelection).catch(e => {
            onError(e);
        });
    }

    onRenderGroup(data){
        const {onToggleCollapse, styles, ...all} = data;
        const {unique} = this.props;
        const {selection} = this.state;

        const toggleCollapse = (group) => {
            onToggleCollapse(group);
            if (!group.isCollapsed && !group.node.isLoaded()) {
                group.node.load();
            }
            group.node.setCollapsed(group.isCollapsed);
        };
        const isGroupLoading = (group) => group.node.isLoading();

        const hStyles = {
            ...styles,
            headerCount:{display:'none'},
            title:{marginRight: 10},
        };
        if(data.group.startIndex === 0){
            //hStyles.check = {visibility:'hidden'};
        }
        const other = {};
        if(unique){
            other.onToggleSelectGroup = (group) => {
                selection.setAllSelected(false);
                all.onToggleSelectGroup(group);
            }
        }
        return <GroupHeader
            {...all}
            styles={hStyles}
            isGroupLoading={isGroupLoading}
            onToggleCollapse={toggleCollapse}
            {...other}
        />
    }

    render(){

        const {tree, selection} = this.state;
        let items = [], groups = [];
        this.nodesToGroups(items, groups, tree);

        return (
            <div>
                <FocusZone>
                    <SelectionZone selection={selection} selectionMode={SelectionMode.single}>
                        <GroupedList
                            items={[]}
                            selection={selection}
                            selectionMode={SelectionMode.multiple}
                            groups={groups}
                            groupProps={{showEmptyGroups:true, onRenderHeader:this.onRenderGroup.bind(this)}}
                            compact={true}
                            onRenderCell={()=>{return null}}
                        />
                    </SelectionZone>
                </FocusZone>
            </div>
        );
    }

}
