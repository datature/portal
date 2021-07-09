/* eslint-disable prefer-const */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/sort-comp */
import React from "react";
import cloneDeep from "lodash/cloneDeep";
import {
  Dialog,
  Classes,
  Button,
  Divider,
  FormGroup,
  InputGroup,
  TreeNodeInfo,
  Tree,
  Spinner,
  Tooltip,
  ControlGroup,
  Icon,
  Intent,
  Position,
} from "@blueprintjs/core";
import {
  APIGetAssetsTree,
  APIPostRegisterImage,
  APIUpdateAsset,
  APIDeleteAsset,
} from "@portal/api/annotation";
import { CreateGenericToast } from "@portal/utils/ui/toasts";
import isElectron from "is-electron";
import classes from "./filemodal.module.css";

type NodePath = number[];

interface FileModalProps {
  project: string;
  isOpen: boolean;
  useDarkTheme: boolean;
  allowUserClose: boolean;
  onClose: () => void;
  callbacks: {
    RefreshProject: () => void;
    UpdateImage: () => void;
  };
}

interface FileModalState {
  parsedTree: Array<any>;
  // flattenedTree: Array<string>;
  isAPICalled: boolean;
  text: string;
  notFoundFolder: Array<string>;
}

export default class FileModal extends React.Component<
  FileModalProps,
  FileModalState
> {
  constructor(props: FileModalProps) {
    super(props);
    this.state = {
      parsedTree: [],
      isAPICalled: false,
      text: "",
      notFoundFolder: [],
    };
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleElectronFileDialog = this.handleElectronFileDialog.bind(this);
    this.handleDeleteFolder = this.handleDeleteFolder.bind(this);
    this.handleNodeCollapse = this.handleNodeCollapse.bind(this);
    this.handleNodeExpand = this.handleNodeExpand.bind(this);
  }

  private refreshTree = async () => {
    this.setState({ isAPICalled: true });
    await APIGetAssetsTree()
      .then(result => {
        if (result.status === 200) {
          this.setState({
            parsedTree: this.setTreeNodeInfo(result.data),
          });
        }
      })
      .catch(error => {
        let message = `Failed to obtain current folders. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPICalled: false });
  };

  private handleRegisterImages = async (path: string) => {
    const encodedPath = encodeURIComponent(path);
    await APIPostRegisterImage(encodedPath)
      .then(result => {
        if (result.status === 200) {
          this.refreshTree();
          console.log("Successfully registered");
          this.props.callbacks.UpdateImage();
        }
      })
      .catch(error => {
        let message = `Failed to register folder. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
  };

  private handleElectronRegisterListener = (event: any, args: string[]) => {
    this.setState({ text: args[0] });
    this.handleRegisterImages(args[0]);
  };

  componentDidMount(): void {
    this.refreshTree();
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.on("select-dirs-reply", this.handleElectronRegisterListener);
    }
  }

  componentWillUnmount(): void {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.removeListener(
        "select-dirs-reply",
        this.handleElectronRegisterListener
      );
    }
  }

  /** Methods related to Registering new folders */
  private handleKeyDown = async (event: any) => {
    if (event.key === "Enter") {
      this.handleRegisterImages(this.state.text);
    }
  };

  private handleElectronFileDialog = () => {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.send("select-dirs");
    } else {
      CreateGenericToast(
        "This feature is not alvailable in web browser.",
        Intent.WARNING,
        3000
      );
    }
  };

  private handleUpdateFolder = async (path: string) => {
    await APIUpdateAsset(path)
      .then(result => {
        if (result.status === 200) {
          const index = this.state.notFoundFolder.indexOf(path);
          if (index > 0) {
            this.setState(prevState => {
              const arr = { ...prevState.notFoundFolder };
              arr.splice(index, 1);
              return { notFoundFolder: arr };
            });
          }
        }
        this.props.callbacks.UpdateImage();
      })
      .catch(error => {
        const index = this.state.notFoundFolder.indexOf(path);
        if (index < 0) {
          this.setState(prevState => {
            const arr = prevState.notFoundFolder;
            console.log(arr);
            arr.push(path);
            return { notFoundFolder: arr };
          });
        }

        let message = `Failed to update folder. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.refreshTree();
    this.setState({ isAPICalled: false });
  };

  private handleDeleteFolder = async (path: string) => {
    await APIDeleteAsset(path)
      .then(result => {
        if (result.status === 200) {
          this.refreshTree();
        }
        this.props.callbacks.UpdateImage();
      })
      .catch(error => {
        let message = `Failed to delete folder. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPICalled: false });
  };

  /** Methods related to oarsing the Tree */
  private createFile(folderPath: string, name: string, disable: boolean) {
    let path = decodeURIComponent(folderPath);
    if (path.includes("\\")) {
      path = `${path}\\${name}`;
    } else {
      path = `${path}/${name}`;
    }
    return {
      id: encodeURIComponent(path),
      icon: (
        <Icon
          icon="document"
          intent={disable ? Intent.WARNING : Intent.NONE}
          className={
            disable ? [classes.NotFound, classes.Icon].join(" ") : classes.Icon
          }
        />
      ),
      label: name,
    };
  }

  private createFolder(
    path: string,
    name: string,
    images: Array<string>,
    folders: Array<any>,
    secondaryLabel: boolean,
    disable: boolean
  ) {
    const childNodes: Array<any> = [];

    images.forEach(file => {
      childNodes.push(this.createFile(path, file, disable));
    });

    folders.forEach(f => {
      childNodes.push(
        this.createFolder(f.path, f.name, f.images, f.folders, false, disable)
      );
    });

    return {
      id: `${path}`,
      icon: (
        <Icon
          icon="folder-close"
          className={
            disable ? [classes.NotFound, classes.Icon].join(" ") : classes.Icon
          }
        />
      ),
      isExpanded: false,
      label: name,
      childNodes,
      secondaryLabel: (
        <>
          {secondaryLabel ? (
            <ControlGroup>
              <Tooltip content="Sync">
                <Button
                  icon={<Icon icon="repeat" iconSize={10} />}
                  minimal
                  onClick={() => {
                    this.handleUpdateFolder(`${path}`);
                  }}
                />
              </Tooltip>
              <Tooltip content="Remove Folder">
                <Button
                  icon="small-cross"
                  minimal
                  onClick={() => {
                    this.handleDeleteFolder(`${path}`);
                  }}
                />
              </Tooltip>
            </ControlGroup>
          ) : null}
        </>
      ),
    };
  }

  private setTreeNodeInfo(trees: Array<any>) {
    return trees.map(folder => {
      let disable = false;
      if (this.state.notFoundFolder.indexOf(folder.path) >= 0) disable = true;

      return this.createFolder(
        folder.path,
        folder.name,
        folder.images,
        folder.folders,
        true,
        disable
      );
    });
  }

  /** Methods related to manipulation of parsedTree State */
  private forNodeAtPath(
    nodes: TreeNodeInfo[],
    path: NodePath,
    callback: (node: TreeNodeInfo) => void
  ) {
    callback(Tree.nodeFromPath(path, nodes));
  }

  private handleNodeCollapse = (_node: TreeNodeInfo, nodePath: NodePath) => {
    const tree = this.state.parsedTree;
    const newState = cloneDeep(tree);
    this.forNodeAtPath(newState, nodePath, (nodeInfo: TreeNodeInfo) => {
      // eslint-disable-next-line no-param-reassign
      nodeInfo.isExpanded = false;
    });
    this.setState({ parsedTree: newState });
  };

  private handleNodeExpand = (_node: TreeNodeInfo, nodePath: NodePath) => {
    // "SET_IS_EXPANDED"
    const tree = this.state.parsedTree;
    const newState = cloneDeep(tree);
    this.forNodeAtPath(newState, nodePath, (nodeInfo: TreeNodeInfo) => {
      // eslint-disable-next-line no-param-reassign
      nodeInfo.isExpanded = true;
    });
    this.setState({ parsedTree: newState });
  };

  public render(): JSX.Element {
    const browseButton = (
      <Button
        text="Browse"
        icon="folder-new"
        intent="success"
        loading={false}
        onClick={() => {
          this.handleElectronFileDialog();
        }}
      />
    );
    const browseHint = (
      <Tooltip
        content={
          // eslint-disable-next-line react/jsx-wrap-multilines
          <>
            <p>Type the path of the folder and press Enter</p>
            <b>Example</b>
            <p>
              <pre>/user/example/folder</pre>
            </p>
          </>
        }
        position={Position.TOP}
      >
        <Icon icon="help" className={classes.HintIcon} />
      </Tooltip>
    );
    return (
      <>
        <Dialog
          icon="folder-open"
          title="File Management"
          canEscapeKeyClose={this.props.allowUserClose}
          canOutsideClickClose={this.props.allowUserClose}
          className={[
            classes.Dialog,
            this.props.useDarkTheme ? "bp3-dark" : "",
          ].join(" ")}
          {...this.props}
        >
          <div className={Classes.DIALOG_BODY}>
            <FormGroup label="Add new folder" labelFor="label-input">
              <InputGroup
                id="label-input"
                placeholder="Enter folder path..."
                rightElement={isElectron() ? browseButton : browseHint}
                onKeyDown={this.handleKeyDown}
                value={this.state.text}
                onChange={event => {
                  this.setState({ text: event.target.value });
                }}
              />
            </FormGroup>

            {/* Divider */}
            <Divider className={classes.Divider} />

            <div>Current Folders</div>
            {this.state.isAPICalled ? (
              <Spinner />
            ) : (
              <Tree
                contents={this.state.parsedTree}
                onNodeCollapse={this.handleNodeCollapse}
                onNodeExpand={this.handleNodeExpand}
                className={(Classes.ELEVATION_0, classes.Tree)}
              />
            )}
          </div>
        </Dialog>
      </>
    );
  }
}
