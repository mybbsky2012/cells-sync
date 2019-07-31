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
import React from 'react'
import TreeView from "./TreeView";
import {Dialog, DialogFooter, DialogContent, PrimaryButton, DefaultButton, MessageBar, MessageBarType} from "office-ui-fabric-react";
import {ScrollablePane} from 'office-ui-fabric-react/lib/ScrollablePane'
import {withTranslation} from 'react-i18next'

class TreeDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selection:[], error: null}
    }

    submit(){
        const {selection} = this.state;
        const {initialSelection} = this.props;
        if((!selection || !selection.length) && !initialSelection) {
            window.alert('Please pick a folder')
        } else if(selection) {
            this.props.onSelect(selection);
            this.props.onDismiss();
        } else {
            this.props.onSelect(initialSelection);
            this.props.onDismiss();
        }
    }

    render() {
        const {uri, t, initialSelection, unique, ...dialogProps} = this.props;
        const {error} = this.state;
        return (
            <Dialog {...dialogProps} minWidth={700} title={t('tree.title')} modalProps={{...dialogProps.modalProps,isBlocking: false}}>
                <DialogContent styles={{innerContent:{minHeight: 400}, inner:{padding:0}, title:{display:'none'}}}>
                    <ScrollablePane styles={{contentContainer:{maxHeight:400, backgroundColor:'#fafafa'}}}>
                        {error &&
                        <MessageBar messageBarType={MessageBarType.error} isMultiline={false} onDismiss={()=>{this.setState({error: null})}} dismissButtonAriaLabel="Dismiss">
                            {error.message}
                        </MessageBar>
                        }
                        {uri &&
                            <TreeView
                                unique={unique}
                                uri={uri}
                                initialSelection={initialSelection}
                                onError={(err) => {this.setState({error: err})}}
                                onSelectionChanged={(sel) => {this.setState({selection: sel})}}
                            />
                        }
                    </ScrollablePane>
                </DialogContent>
                <DialogFooter>
                    <DefaultButton onClick={this.props.onDismiss} text={t('button.cancel')}/>
                    <PrimaryButton onClick={this.submit.bind(this)} text={t('button.select')}/>
                </DialogFooter>
            </Dialog>
        );
    }

}

TreeDialog = withTranslation()(TreeDialog);
export {TreeDialog as default}