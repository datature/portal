/* eslint-disable indent */
/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/sort-comp */
import React from "react";
import {
  Button,
  FormGroup,
  InputGroup,
  ProgressBar,
  Intent,
  Position,
  Drawer,
  Popover,
  Menu,
  MenuItem,
  Spinner,
  Classes,
  Tabs,
  Tab,
  TabId,
  Icon,
  IconName,
  Alert,
  Alignment,
  Tag,
  Navbar,
  NavbarGroup,
  IconSize,
  PopoverInteractionKind,
  Tooltip,
} from "@blueprintjs/core";
import {
  APIGetRegisteredModels,
  APIRegisterModel,
  APIUnloadModel,
  APILoadModel,
  APIDeleteRegisteredModel,
  APIGetModelTags,
  APIGetLoadedModel,
} from "@portal/api/annotation";

import { TagColours } from "@portal/constants/annotation";
import isElectron from "is-electron";
import { CreateGenericToast } from "@portal/utils/ui/toasts";

import classes from "./model.module.css";

export type RegisteredModel = {
  name: string;
  hash: string;
  description: string;
  directory: string;
};

export type FormData = {
  type: string;
  name: string;
  description: string;
  directory: string;
  modelKey: string;
  projectSecret: string;
  modelType: "tensorflow" | "darknet" | "";
};

interface ModelProps {
  project: string;
  useDarkTheme: boolean;
  isConnected: boolean;
  callbacks: {
    HandleModelChange: (model: RegisteredModel | undefined) => void;
  };
}

interface ModelState {
  /** Dict of registered model to be obtained from server (key: hashkey) */
  registeredModelList: { [key: string]: RegisteredModel } | any;
  /** This referes to the current loaded model */
  currentModel: RegisteredModel | undefined;
  /** This referes to the model chosen to be viewed or loaded */
  chosenModel: RegisteredModel | undefined;
  /** Contains data from the model registration form */
  formData: FormData;
  /** Tab id */
  drawerTabId: TabId;
  /** Tab id */
  registrationTabId: TabId;
  /** General icon format (used in the registration form to show outcome) */
  generalIcon: { name: IconName; intent: Intent } | undefined;
  /** Model Tag map */
  projectTags: { [tag: string]: number } | any;
  /** Waits for the run time seperately from the heartbeat (so that model list is updated when server loads) */
  waitForRuntime: boolean;

  /** The following are self explanatory boolean states */
  isConfirmLoad: boolean;
  isConfirmDelete: boolean;
  isConfirmUnload: boolean;
  isUnloadModelAPI: boolean;
  isLoadModelAPI: boolean;
  isAPIcalled: boolean;
  isGetTagAPI: boolean;
  isOpenDrawer: boolean;
  isOpenRegistraionForm: boolean;
}

export default class Model extends React.Component<ModelProps, ModelState> {
  constructor(props: ModelProps) {
    super(props);
    this.state = {
      registeredModelList: {},
      currentModel: undefined,
      chosenModel: undefined,
      waitForRuntime: true,
      isConfirmLoad: false,
      isConfirmUnload: false,
      isConfirmDelete: false,
      isAPIcalled: false,
      isUnloadModelAPI: false,
      isLoadModelAPI: false,
      isGetTagAPI: false,
      isOpenDrawer: false,
      isOpenRegistraionForm: false,
      generalIcon: undefined,
      projectTags: {},
      formData: {
        type: "local",
        modelType: "tensorflow",
        name: "",
        description: "",
        directory: "",
        modelKey: "",
        projectSecret: "",
      },
      drawerTabId: "details",
      registrationTabId: "local",
    };
    this.createMenuItems = this.createMenuItems.bind(this);
    this.handleRegisterModel = this.handleRegisterModel.bind(this);
    this.handleElectronFileDialog = this.handleElectronFileDialog.bind(this);
    this.handleUnloadAndLoadModel = this.handleUnloadAndLoadModel.bind(this);
    this.handleDeleteModel = this.handleDeleteModel.bind(this);
    this.formatLongStringName = this.formatLongStringName.bind(this);
    // this.handleElectronChangeDirListener = this.handleElectronChangeDirListener.bind(this);
  }

  async componentDidMount(): Promise<void> {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.on(
        "select-model-reply",
        this.handleElectronChangeDirListener
      );
    }
    while (this.state.waitForRuntime) {
      // eslint-disable-next-line no-await-in-loop
      await APIGetRegisteredModels()
        .then(async result => {
          if (result.status === 200) {
            this.setState({
              registeredModelList: this.generateRegisteredModelList(
                result.data
              ),
            });
            if (this.state.registeredModelList !== {}) {
              // eslint-disable-next-line no-await-in-loop
              await this.handleGetLoadedModel();
            }
            this.setState({ waitForRuntime: false });
          }
        })
        .catch(() => {
          /** Do Nothing */
        });

      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, 25000));
    }
  }

  componentWillUnmount(): void {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.removeListener(
        "select-model-reply",
        this.handleElectronChangeDirListener
      );
    }
  }

  /** -------- Methods related to API calls -------- */

  /** Calls the Model Registratiion API with info recorded in formData */
  private handleRegisterModel = async () => {
    this.setState({ isAPIcalled: true });
    if (
      this.state.formData.type === "hub" &&
      (this.state.formData.modelKey === "" ||
        this.state.formData.projectSecret === "" ||
        this.state.formData.name === "")
    ) {
      CreateGenericToast(
        "Please fill in the name,  model key and project secret of the model you want to load from hub.",
        Intent.WARNING,
        3000
      );
    } else if (
      this.state.formData.type === "local" &&
      (this.state.formData.name === "" || this.state.formData.directory === "")
    ) {
      CreateGenericToast(
        "Please fill in the name and path of the model.",
        Intent.WARNING,
        3000
      );
    } else if (
      this.state.formData.type === "endpoint" &&
      (
        this.state.formData.modelKey === "" ||
        this.state.formData.projectSecret === "" ||
        this.state.formData.name === ""
      )
    ) {
      CreateGenericToast(
        "Please fill in the name,  model key and project secret of the model you want to load from endpoint.",
        Intent.WARNING,
        3000
      );
    } else {
      await APIRegisterModel(
        this.state.formData.type,
        this.state.formData.modelType,
        this.state.formData.name,
        this.state.formData.description,
        this.state.formData.directory,
        this.state.formData.modelKey,
        this.state.formData.projectSecret
      )
        .then(result => {
          if (result.status === 200) {
            this.setState({
              registeredModelList: this.generateRegisteredModelList(
                result.data
              ),
              generalIcon: { name: "tick", intent: Intent.SUCCESS },
            });
          }
        })
        .catch(error => {
          this.setState({
            generalIcon: { name: "cross", intent: Intent.DANGER },
          });
          let message = "Failed to register model.";
          if (error.response) {
            if (error.response.data.error_code === 3001) {
              if (this.state.formData.modelType === "tensorflow")
                message = "Are you sure this is a TensorFlow Model?";
              else if (this.state.formData.modelType === "darknet")
                message = "Are you sure this is a Darknet Model?";
            } else {
              message = `${error.response.data.message}`;
            }
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }
    this.setState({ isAPIcalled: false });
  };

  /** Calls the get all loaded models API
   * Note: Even though the api returns a list, there should only be one loaded model
   * This is ensured in handleUnloadAndLoadModel()
   * */
  private handleGetLoadedModel = async () => {
    this.setState({ isLoadModelAPI: true });
    await APIGetLoadedModel().then(result => {
      if (result.status === 200) {
        this.setState(prevState => {
          const model = prevState.registeredModelList[result.data[0]];
          this.props.callbacks.HandleModelChange(model);
          return { currentModel: model };
        });
      }
    });
    this.setState({ isLoadModelAPI: false });
  };

  /** Calls the get all registered models API */
  private handleRefreshModelList = async () => {
    this.setState({ isAPIcalled: true });
    await APIGetRegisteredModels()
      .then(result => {
        if (result.status === 200) {
          this.setState({
            registeredModelList: this.generateRegisteredModelList(result.data),
          });
        }
      })
      .catch(error => {
        let message = "Failed to refresh model list.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPIcalled: false });
  };

  /** Calls the unloaded models API
   * The model it unloads is the currentModel
   */
  private handleUnloadModel = async () => {
    this.setState({ isUnloadModelAPI: true });
    if (this.state.currentModel !== undefined) {
      await APIUnloadModel(this.state.currentModel.hash)
        .then(result => {
          if (result.status === 200) {
            this.setState({
              currentModel: undefined,
            });
            this.props.callbacks.HandleModelChange(undefined);
          }
        })
        .catch(error => {
          let message = "Failed to unload current model.";
          if (error.response) {
            message = `${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }
    this.setState({
      isUnloadModelAPI: false,
      isConfirmUnload: false,
      isOpenDrawer: false,
    });
  };

  /** Unloads the currentModel and loads the chosenModel
   * Calls handleUnloadModel() to unload
   * Calls the load model API
   * */
  private handleUnloadAndLoadModel = async () => {
    this.setState({ isLoadModelAPI: true });
    if (this.state.chosenModel === undefined) {
      CreateGenericToast(
        "There is no model chosen to be loaded",
        Intent.WARNING,
        3000
      );

      this.setState({ isLoadModelAPI: false, isConfirmLoad: false });
      return;
    }
    await this.handleUnloadModel();
    const key = this.state.chosenModel?.hash;
    await APILoadModel(key)
      .then(result => {
        if (result.status === 200) {
          const model = this.state.registeredModelList[key];
          if (model) {
            this.setState({
              currentModel: model,
            });
            this.props.callbacks.HandleModelChange(model);
          } else {
            CreateGenericToast(
              "Loaded model not found in list of registered model",
              Intent.DANGER,
              3000
            );
          }
        }
      })
      .catch(error => {
        let message = "Cannot load model.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isLoadModelAPI: false, isConfirmLoad: false });
  };

  /** Deletes a registered model aka chosenModel
   * If the chosenModel is the currentModel loaded, it will unload it before deletion
   * Calls handleUnloadModel() to unload
   * Calls the delete model API
   * Calls get all registered model api to update the registeredModelList
   * */
  private handleDeleteModel = async () => {
    this.setState({ isAPIcalled: true, isConfirmDelete: true });
    if (this.state.chosenModel !== undefined) {
      if (this.state.currentModel?.hash === this.state.chosenModel.hash) {
        this.handleUnloadModel;
      }
      await APIDeleteRegisteredModel(this.state.chosenModel.hash)
        .then(result => {
          if (result.status === 200) {
            this.handleRefreshModelList();
          }
        })
        .catch(error => {
          let message = "Failed to delete model.";
          if (error.response) {
            message = `${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });

      await APIGetRegisteredModels()
        .then(async result => {
          if (result.status === 200) {
            this.setState({
              registeredModelList: this.generateRegisteredModelList(
                result.data
              ),
            });
            if (this.state.registeredModelList !== {}) {
              // eslint-disable-next-line no-await-in-loop
              await this.handleGetLoadedModel();
            }
          }
        })
        .catch(() => {
          /** Do Nothing */
        });
    }

    this.setState({
      isOpenDrawer: false,
      isAPIcalled: false,
      isConfirmDelete: false,
      currentModel: undefined,
      chosenModel: undefined,
    });
  };

  /** Calls the get all model tags for the chosenModel to update the projectTags */
  private handleGetModelTags = async () => {
    this.setState({ isGetTagAPI: true });
    if (this.state.chosenModel !== undefined) {
      await APIGetModelTags(this.state.chosenModel.hash)
        .then(result => {
          if (result.status === 200) {
            this.setState({ projectTags: result.data });
          }
        })
        .catch(error => {
          let message = "Failed to get model tags.";
          if (error.response) {
            message = `${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }

    this.setState({ isGetTagAPI: false });
  };

  /** ------- Methods related to Registered Model List ------- */

  /** Updates the formData. Called when there is a change in the registration form */
  private handleChangeForm = (event: any) => {
    // eslint-disable-next-line react/no-access-state-in-setstate, prefer-const
    let form: any = this.state.formData;
    form[event.target.name] = event.target.value;
    this.setState({ formData: form });
  };

  /** Sets up a call for electron to browse the file dialog directory */
  private handleElectronFileDialog = () => {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.send("select-model");
    } else {
      CreateGenericToast(
        "This feature is not alvailable in web browser.",
        Intent.WARNING,
        3000
      );
    }
  };

  /** Listener for electron to updates the formData.directory when ipcrender sends a reply */
  private handleElectronChangeDirListener = (event: any, args: string[]) => {
    this.setState(prevState => {
      // eslint-disable-next-line prefer-const
      let form: any = prevState.formData;
      // eslint-disable-next-line prefer-destructuring
      form.directory = args[0];
      return { formData: form };
    });
  };

  /** Generate the registered model list
   * @params data : data from the api call
   * @return dict : registered model list in a dictionary format
   */
  private generateRegisteredModelList = (data: any) => {
    const modelArr: string[] = Object.keys(data);
    // eslint-disable-next-line prefer-const
    let dict: any = {};
    modelArr.forEach(key => {
      dict[key] = {
        name: data[key].name,
        description: data[key].description,
        hash: key,
        directory: data[key].directory,
      };
    });
    return dict;
  };

  /** Create MenuItems from the registereModelList
   * @return {Array<MenuItem>} An array of registered models in the format of MenuItems
   */
  private createMenuItems = () => {
    const modelArr: string[] = Object.keys(this.state.registeredModelList);
    return modelArr.map(key => {
      const model = this.state.registeredModelList[key];
      const icon = (
        <span className={"bp3-menu-item-label"}>
          <Icon
            icon="dot"
            intent={
              model.hash === this.state.currentModel?.hash
                ? Intent.SUCCESS
                : Intent.DANGER
            }
          />
        </span>
      );
      const rightButtons = (
        <div>
          <Button
            icon="cog"
            intent={Intent.NONE}
            minimal
            onClick={event => {
              this.handleOpenDrawer(model);
              event.stopPropagation();
            }}
          />
        </div>
      );
      return (
        <MenuItem
          shouldDismissPopover={false}
          className={classes.MenuItems}
          icon={icon}
          text={this.formatLongStringName(model.name, 35)}
          id={model.hash}
          key={model.hash}
          labelElement={rightButtons}
          disabled={this.state.isAPIcalled}
          onClick={() => {
            if (!this.state.isOpenDrawer)
              this.setState({ chosenModel: model, isConfirmLoad: true });
          }}
        />
      );
    });
  };

  /** ------- Methods related to Drawer ------- */

  /** Opens the Drawer of the registered Model clicked. Updates the isOpenDrawe and chosenModel */
  private handleOpenDrawer = async (model: RegisteredModel) => {
    await this.setState({ isOpenDrawer: true, chosenModel: model });
    this.handleGetModelTags();
  };

  /** Close the Drawer of the chosenModel. Updates the isOpenDrawe and chosenModel */
  private handleCloseDrawer = () => {
    this.setState({ isOpenDrawer: false, chosenModel: undefined });
  };

  /** Handles the change in drawer tab */
  private handleDrawerTabChange = (tabId: TabId) =>
    this.setState({ drawerTabId: tabId });

  /** Handles the change in registration tab. Resets the formData to default */
  private handleRegistrationTabChange = (tabId: TabId) => {
    this.setState({
      formData: {
        type: tabId.toString(),
        modelType: "tensorflow",
        name: "",
        description: "",
        directory: "",
        modelKey: "",
        projectSecret: "",
      },
      registrationTabId: tabId,
    });
  };

  /** Obtain the tagcolours */
  private handleGetTagHashColour = (tagid: number): string => {
    return TagColours[tagid % TagColours.length];
  };

  /** ------- Miscellaneous methods ------- */

  /** Reduce the length of a string and apend with "..." */
  private formatLongStringName = (str: string, length: number) => {
    if (str.length > length) {
      return `${str.substring(0, length - 1)}..`;
    }
    return str;
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
            <p>
              Type the path of the folder that contains the model and
              label_map.pbtxt
            </p>
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

    const menuOfModels = (
      <Menu className={classes.PopOverMenu}>
        {Object.keys(this.state.registeredModelList).length === 0 ? (
          <div className={classes.NonIdealPopOver}>
            <div className="bp3-non-ideal-state">
              <div className="bp3-non-ideal-state-visual">
                <Icon icon="folder-open" iconSize={IconSize.LARGE} />
              </div>
              <h5 className="bp3-heading bp3-text-muted">
                Press the + sign to add new models
              </h5>
            </div>
          </div>
        ) : (
          this.createMenuItems()
        )}
      </Menu>
    );

    const modelTypes = {
      tensorflow: "TensorFlow 2.0",
      darknet: "DarkNet (YOLO v3, YOLO v4)",
    };

    const registerModelForm = (
      <div className={classes.RegistrationForm}>
        {this.state.registrationTabId === "local" ? (
          <>
            <FormGroup label="Model Type" labelFor="label-input">
              <Popover
                minimal
                content={
                  // eslint-disable-next-line react/jsx-wrap-multilines
                  <Menu>
                    <Menu.Item
                      shouldDismissPopover={false}
                      text={modelTypes.tensorflow}
                      onClick={() => {
                        const event = {
                          target: { name: "modelType", value: "tensorflow" },
                        };
                        this.handleChangeForm(event);
                      }}
                    />
                    <Menu.Item
                      shouldDismissPopover={false}
                      text={modelTypes.darknet}
                      onClick={() => {
                        const event = {
                          target: { name: "modelType", value: "darknet" },
                        };
                        this.handleChangeForm(event);
                      }}
                    />
                  </Menu>
                }
                placement="bottom-start"
              >
                <Button
                  text={
                    this.state.formData.modelType !== ""
                      ? modelTypes[this.state.formData.modelType]
                      : "None selected"
                  }
                  rightIcon="double-caret-vertical"
                />
              </Popover>
            </FormGroup>
          </>
        ) : null}
        <FormGroup label="Name" labelFor="label-input">
          <InputGroup
            id="name"
            name="name"
            value={this.state.formData.name}
            placeholder="Enter name of the model..."
            onChange={this.handleChangeForm}
          />
        </FormGroup>
        {this.state.registrationTabId === "local" ? (
          // registration tab is local
          <FormGroup label="Folder Path" labelFor="label-input">
            <InputGroup
              id="directory"
              name="directory"
              value={this.state.formData.directory}
              placeholder={"Enter model folder path..."}
              onChange={this.handleChangeForm}
              rightElement={isElectron() ? browseButton : browseHint}
            />
          </FormGroup>
        ) : this.state.registrationTabId === "hub" ? (
          // registration tab is hub
          <>
            <FormGroup label="Model Key" labelFor="label-input">
              <InputGroup
                id="modelKey"
                name="modelKey"
                value={this.state.formData.modelKey}
                placeholder="Enter model key from hub..."
                onChange={this.handleChangeForm}
              />
            </FormGroup>
            <FormGroup label="Project Secret" labelFor="label-input">
              <InputGroup
                id="projectSecret"
                name="projectSecret"
                value={this.state.formData.projectSecret}
                placeholder="Enter project secret from hub..."
                onChange={this.handleChangeForm}
              />{" "}
            </FormGroup>
          </>
        ) : (
          // else, registration tab is endpoint
          <>
            <FormGroup label="Model Key" labelFor="label-input">
              <InputGroup
                id="modelKey"
                name="modelKey"
                value={this.state.formData.modelKey}
                placeholder="Enter model key from endpoint..."
                onChange={this.handleChangeForm}
              />
            </FormGroup>
            <FormGroup label="Project Secret" labelFor="label-input">
              <InputGroup
                id="projectSecret"
                name="projectSecret"
                value={this.state.formData.projectSecret}
                placeholder="Enter project secret from endpoint..."
                onChange={this.handleChangeForm}
              />{" "}
            </FormGroup>
          </>
        )}
        <Button
          type="submit"
          text="Register"
          disabled={this.state.isAPIcalled}
          onClick={this.handleRegisterModel}
        />
        <div className={classes.Right}>
          {this.state.isAPIcalled ? (
            <Spinner size={14} />
          ) : this.state.generalIcon !== undefined ? (
            <Icon
              icon={this.state.generalIcon?.name}
              intent={this.state.generalIcon?.intent}
              iconSize={14}
            />
          ) : null}
        </div>
      </div>
    );

    const detailsPanel = (
      <div className={classes.Panel}>
        <div className={["bp3-elevation-2", classes.Section].join(" ")}>
          <h6 className="bp3-heading">
            {/* <Icon icon="folder-open" /> */}
            Directory
          </h6>
          <p className="bp3-running-text">
            {this.state.chosenModel?.directory}
          </p>
        </div>
        <div className={["bp3-elevation-2", classes.Section].join(" ")}>
          <h6 className="bp3-heading">
            {/* <Icon icon="tag" /> */}
            Tag Map
          </h6>
          <div className={classes.TagsList}>
            <FormGroup>
              {this.state.isGetTagAPI ? (
                <Spinner className={classes.Spin} />
              ) : (
                Object.keys(this.state.projectTags).map(tagname => {
                  return (
                    <Tag
                      key={this.state.projectTags[tagname]}
                      interactive={true}
                      className={classes.TagLabel}
                    >
                      <Icon
                        icon={"symbol-circle"}
                        color={this.handleGetTagHashColour(
                          this.state.projectTags[tagname]
                        )}
                      />{" "}
                      {tagname}
                    </Tag>
                  );
                })
              )}
            </FormGroup>
          </div>
        </div>
      </div>
    );

    const drawer = (
      <Drawer
        className={this.props.useDarkTheme ? "bp3-dark" : "bp3-light"}
        size="360px"
        onClose={this.handleCloseDrawer}
        canEscapeKeyClose={true}
        canOutsideClickClose={true}
        isOpen={this.state.isOpenDrawer}
        position={Position.RIGHT}
        usePortal={true}
      >
        <div className="bp3-drawer-header">
          <Icon
            className="bp3-icon"
            icon="dot"
            iconSize={14}
            intent={
              this.state.chosenModel?.hash === this.state.currentModel?.hash
                ? Intent.SUCCESS
                : Intent.DANGER
            }
          />
          <h4 className="bp3-heading">{this.state.chosenModel?.name}</h4>
          <Button
            className="bp3-dialog-close-button"
            minimal
            icon="arrow-right"
            onClick={this.handleCloseDrawer}
          />
        </div>
        <Navbar className={classes.DrawerNavbar}>
          <NavbarGroup align={Alignment.LEFT} className={classes.DrawerNavbar}>
            <Tabs
              id="DrawerTabs"
              large={true}
              onChange={this.handleDrawerTabChange}
              selectedTabId={this.state.drawerTabId}
              renderActiveTabPanelOnly={true}
            >
              <Tab id="details" title="Details" />
              <Tabs.Expander />
            </Tabs>
          </NavbarGroup>
        </Navbar>
        <div className={Classes.DRAWER_BODY}>
          <div>
            {this.state.drawerTabId === "details" ? detailsPanel : null}
          </div>
        </div>
        <div
          className={[
            Classes.DIALOG_FOOTER_ACTIONS,
            Classes.DRAWER_FOOTER,
          ].join(" ")}
        >
          <Button
            type="button"
            text="Unload"
            disabled={
              this.state.chosenModel?.hash !== this.state.currentModel?.hash ||
              this.state.isUnloadModelAPI
            }
            onClick={() => {
              this.setState({ isConfirmUnload: true });
            }}
          />
          <Popover
            interactionKind={PopoverInteractionKind.HOVER}
            content={<div className={classes.Section}>Delete</div>}
          >
            <Button
              type="button"
              intent={Intent.DANGER}
              disabled={this.state.isAPIcalled}
              icon="trash"
              onClick={() => {
                this.setState({ isConfirmDelete: true });
              }}
            />
          </Popover>
        </div>
      </Drawer>
    );

    return (
      <>
        <div style={{ maxWidth: "140px", minWidth: "140px" }}>
          {this.state.isLoadModelAPI ? (
            <ProgressBar />
          ) : (
            <Popover
              className={classes.PopOver}
              content={menuOfModels}
              placement="bottom"
              isOpen={this.state.isOpenDrawer ? false : undefined}
              disabled={this.state.waitForRuntime && !this.props.isConnected}
            >
              <Tooltip
                content="Select a Model to Load"
                disabled={
                  Object.keys(this.state.registeredModelList).length === 0 ||
                  !!this.state.currentModel
                }
                isOpen={
                  !this.state.isOpenRegistraionForm &&
                  !this.state.isOpenDrawer &&
                  !this.state.currentModel &&
                  Object.keys(this.state.registeredModelList).length > 0
                    ? true
                    : undefined
                }
              >
                <Button
                  disabled={
                    this.state.waitForRuntime && !this.props.isConnected
                  }
                  className={
                    this.state.waitForRuntime && !this.props.isConnected
                      ? "bp3-skeleton"
                      : ""
                  }
                  style={{ minWidth: "140px", alignContent: "left" }}
                  alignText={Alignment.LEFT}
                  minimal
                  rightIcon="caret-down"
                  text={
                    this.state.currentModel !== undefined
                      ? this.formatLongStringName(
                          this.state.currentModel.name,
                          15
                        )
                      : "Load Model.."
                  }
                />
              </Tooltip>
            </Popover>
          )}
        </div>
        <Popover
          content={
            // eslint-disable-next-line react/jsx-wrap-multilines
            <>
              <Navbar className={classes.DrawerNavbar}>
                <NavbarGroup
                  align={Alignment.LEFT}
                  className={classes.DrawerNavbar}
                >
                  <Tabs
                    id="RegisterationTabs"
                    large={false}
                    onChange={this.handleRegistrationTabChange}
                    selectedTabId={this.state.registrationTabId}
                    renderActiveTabPanelOnly={true}
                  >
                    <Tab id="local" title="Local" />
                    <Tab id="hub" title="Datature Hub" />
                    <Tab id="endpoint" title="Datature Endpoint" />
                    <Tabs.Expander />
                  </Tabs>
                </NavbarGroup>{" "}
              </Navbar>
              <div className={Classes.DRAWER_BODY}>{registerModelForm}</div>
            </>
          }
          placement="left-end"
          onOpening={() => this.setState({ isOpenRegistraionForm: true })}
          onClosed={() => {
            this.setState({
              generalIcon: undefined,

              formData: {
                type: "local",
                modelType: "tensorflow",
                name: "",
                description: "",
                directory: "",
                modelKey: "",
                projectSecret: "",
              },
              registrationTabId: "local",
              isOpenRegistraionForm: false,
            });
          }}
        >
          <Tooltip
            disabled={Object.keys(this.state.registeredModelList).length > 0}
            content="Add a Model Here"
            isOpen={Object.keys(this.state.registeredModelList).length === 0}
          >
            <Button minimal icon="plus" />
          </Tooltip>
        </Popover>

        {drawer}
        <Alert
          isOpen={this.state.isConfirmLoad}
          intent={Intent.WARNING}
          icon="warning-sign"
          loading={this.state.isLoadModelAPI}
          onCancel={() => this.setState({ isConfirmLoad: false })}
          onConfirm={this.handleUnloadAndLoadModel}
          cancelButtonText={"Cancel"}
          confirmButtonText={"I Understand"}
          className={this.props.useDarkTheme ? "bp3-dark" : ""}
        >
          {this.state.currentModel ? (
            <div>
              We will unload {this.state.currentModel.name} and load{" "}
              {this.state.chosenModel?.name}. Are you sure you want to continue?
            </div>
          ) : (
            <div>
              Confirm that you want to load {this.state.chosenModel?.name}.
            </div>
          )}
        </Alert>
        <Alert
          isOpen={this.state.isConfirmUnload}
          intent={Intent.WARNING}
          icon="warning-sign"
          loading={this.state.isUnloadModelAPI}
          onCancel={() => this.setState({ isConfirmUnload: false })}
          onConfirm={this.handleUnloadModel}
          cancelButtonText={"Cancel"}
          confirmButtonText={"I Understand"}
          className={this.props.useDarkTheme ? "bp3-dark" : ""}
        >
          <div>
            We will unload {this.state.currentModel?.name}. Are you sure you
            want to continue?
          </div>
        </Alert>
        <Alert
          isOpen={this.state.isConfirmDelete}
          intent={Intent.WARNING}
          icon="warning-sign"
          loading={this.state.isAPIcalled}
          onCancel={() => this.setState({ isConfirmDelete: false })}
          onConfirm={this.handleDeleteModel}
          cancelButtonText={"Cancel"}
          confirmButtonText={"I Understand"}
          className={this.props.useDarkTheme ? "bp3-dark" : ""}
        >
          {this.state.currentModel?.hash === this.state.chosenModel?.hash ? (
            <div>
              This model is loaded. We will unload and delete{" "}
              {this.state.currentModel?.name}. Are you sure you want to
              continue?
            </div>
          ) : (
            <div>
              Confirm that you want to delete {this.state.chosenModel?.name}.
            </div>
          )}
        </Alert>
      </>
    );
  }
}
