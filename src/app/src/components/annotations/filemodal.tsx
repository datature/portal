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
  /** Array of the folder tree */
  parsedTree: Array<any>;
  /** Boolean state to check is api is called */
  isAPICalled: boolean;
  /** Text to be shown in the filePath Input Area */
  text: string;
  /** Folders that are not found */
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

  /** Calls the get assets in tree format API to refresh the parsedTree */
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
        let message = "Failed to obtain current folders.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPICalled: false });
  };

  /** Calls the register folders API
   * After registrations, refreshes the tree and
   * Updates the Image bar via the UpdateImage callback
   * @param {string} path: folder path
   */
  private handleRegisterImages = async (path: string) => {
    const encodedPath = encodeURIComponent(path);
    await APIPostRegisterImage(encodedPath)
      .then(result => {
        if (result.status === 200) {
          this.refreshTree();
          this.props.callbacks.UpdateImage();
        }
      })
      .catch(error => {
        let message = "Failed to register folder.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
  };

  /** Sets up a call for electron to browse the file dialog directory */
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

  /** Listener for electron to automatically register the folder when ipcrender sends a reply
   * @param {string[]} args: array of selected folder path
   */
  private handleElectronRegisterListener = (event: any, args: string[]) => {
    this.setState({ text: args[0] });
    this.handleRegisterImages(args[0]);
  };

  /** Handles registration when the user presses Enter key */
  private handleKeyDown = async (event: any) => {
    if (event.key === "Enter") {
      this.handleRegisterImages(this.state.text);
    }
  };

  /** Calls the update assets API which updates the server cached asset folders
   * Refreshes the tree after updating the assets
   * Updates the notfoundFolder is the folder is not found in the directory
   * @param {string} path: folder path to be updated
   */
  private handleUpdateFolder = async (path: string) => {
    this.setState({ isAPICalled: true });
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
            arr.push(path);
            return { notFoundFolder: arr };
          });
        }

        let message = "Failed to update folder.";
        let intent: Intent = Intent.DANGER;
        if (error.response) {
          if (error.response.data.error_code === 3002) {
            intent = Intent.PRIMARY;
          }
          message = `${error.response.data.message}`;
        }
        CreateGenericToast(message, intent, 3000);
      });
    this.refreshTree();
    this.setState({ isAPICalled: false });
  };

  /** Calls the delete assets API which deletes folder from the assets
   * Refreshes the tree after updating the assets
   * @param {string} path: folder path to be deleted
   */
  private handleDeleteFolder = async (path: string) => {
    await APIDeleteAsset(path)
      .then(result => {
        if (result.status === 200) {
          this.refreshTree();
        }
        this.props.callbacks.UpdateImage();
      })
      .catch(error => {
        let message = "Failed to delete folder.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPICalled: false });
  };

  /** ------- Methods related to parsing the Tree ------- */

  /** Create File
   * @param {string} filePath: file path
   * @param {string} name: name of file
   * @param {boolean} disable: determine if the file node should be disabled (true when the file is not found)
   * @returns {Dictionary} Dict with file info
   */
  private createFile(filePath: string, name: string, disable: boolean) {
    let path = decodeURIComponent(filePath);
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

  /** Create Folder
   * @param {string} path: folder path
   * @param {string} name: name of folder
   * @param {Array<string>} images: array of filepaths
   * @param {Array<any>} folders: array of folders
   * @param {boolean} secondaryLabel: determine if a secondary label is needed
   * @param {boolean} disable: determine if the file node should be disabled (true when the file is not found)
   * @returns {Dictionary} Dict with folder info
   */
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

  /** Creates the tree nodes
   * @param {Array<any>} trees: array of folders in tree format
   * @returns {Array<any>} Array of Dict with folder info
   */
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

  /** -------- Methods related to manipulation of parsedTree State -------- */

  /** General handler to manipulate the chosen node */
  private forNodeAtPath(
    nodes: TreeNodeInfo[],
    path: NodePath,
    callback: (node: TreeNodeInfo) => void
  ) {
    callback(Tree.nodeFromPath(path, nodes));
  }

  /** Handles scenario to collpse the tree nodes */
  private handleNodeCollapse = (_node: TreeNodeInfo, nodePath: NodePath) => {
    const tree = this.state.parsedTree;
    const newState = cloneDeep(tree);
    this.forNodeAtPath(newState, nodePath, (nodeInfo: TreeNodeInfo) => {
      // eslint-disable-next-line no-param-reassign
      nodeInfo.isExpanded = false;
    });
    this.setState({ parsedTree: newState });
  };

  /** Handles scenario to expand the tree nodes */
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
