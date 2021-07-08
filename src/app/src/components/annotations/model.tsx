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
  TextArea,
  Icon,
  IconName,
  Alert,
  Alignment,
  Tag,
  Navbar,
  NavbarGroup,
  IconSize,
  ControlGroup,
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
};

interface ModelProps {
  project: string;
  useDarkTheme: boolean;
  callbacks: {
    HandleModelChange: (model: RegisteredModel | undefined) => void;
  };
}

interface ModelState {
  registeredModelList: { [key: string]: RegisteredModel } | any;
  currentModel: RegisteredModel | undefined;
  chosenModel: RegisteredModel | undefined;
  isConfirmLoad: boolean;
  isUnloadModelAPI: boolean;
  isLoadModelAPI: boolean;
  isConfirmDelete: boolean;
  isConfirmUnload: boolean;
  isAPIcalled: boolean;
  isGetTagAPI: boolean;
  isOpenDrawer: boolean;
  isOpenRegistraionForm: boolean;
  formData: FormData;
  drawerTabId: TabId;
  registrationTabId: TabId;
  generalIcon: { name: IconName; intent: Intent } | undefined;
  projectTags: { [tag: string]: number } | any;
}

export default class Model extends React.Component<ModelProps, ModelState> {
  constructor(props: ModelProps) {
    super(props);
    this.state = {
      registeredModelList: {},
      currentModel: undefined,
      chosenModel: undefined,
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
  }

  /** Methods related to API calls */
  private handleRegisterModel = async () => {
    this.setState({ isAPIcalled: true });
    if (
      this.state.formData.type === "hub" &&
      (this.state.formData.modelKey === "" ||
        this.state.formData.projectSecret === "")
    ) {
      CreateGenericToast(
        "Please fill in the model key and project secret of the model you want to load from hub.",
        Intent.WARNING,
        3000
      );
    } else if (
      this.state.formData.name === "" ||
      this.state.formData.directory === ""
    ) {
      CreateGenericToast(
        "Please fill in the name and path of the model.",
        Intent.WARNING,
        3000
      );
    } else {
      await APIRegisterModel(
        this.state.formData.type,
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
          let message = `Failed to register model. ${error}`;
          if (error.response) {
            message = `${error.response.data.error}: ${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }
    this.setState({ isAPIcalled: false });
  };

  private handleGetLoadedModel = async () => {
    this.setState({ isLoadModelAPI: true });
    await APIGetLoadedModel()
      .then(result => {
        if (result.status === 200) {
          this.setState(prevState => {
            const model = prevState.registeredModelList[result.data[0]];
            this.props.callbacks.HandleModelChange(model);
            return { currentModel: model };
          });
        }
      })
      .catch(error => {
        let message = `Failed to get loaded model. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isLoadModelAPI: false });
  };

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
        let message = `Failed to refresh model list. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPIcalled: false });
  };

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
          let message = `Failed to unload current model. ${error}`;
          if (error.response) {
            message = `${error.response.data.error}: ${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }
    this.setState({ isUnloadModelAPI: false, isConfirmUnload: false });
  };

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
        let message = `Cannot load model. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isLoadModelAPI: false, isConfirmLoad: false });
  };

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
          let message = `Failed to delete model. ${error}`;
          if (error.response) {
            message = `${error.response.data.error}: ${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }

    this.setState({ isAPIcalled: false, isConfirmDelete: false });
  };

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
          let message = `Failed to get model tags. ${error}`;
          if (error.response) {
            message = `${error.response.data.error}: ${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }

    this.setState({ isGetTagAPI: false });
  };

  /** Methods related to Registered Model List */

  private handleChangeForm = (event: any) => {
    // eslint-disable-next-line react/no-access-state-in-setstate, prefer-const
    let form: any = this.state.formData;
    form[event.target.name] = event.target.value;
    this.setState({ formData: form });
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
      const rightBuuttons = (
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
          className={classes.MenuItems}
          icon={icon}
          text={this.formatLongStringName(model.name, 35)}
          id={model.hash}
          key={model.hash}
          labelElement={rightBuuttons}
          disabled={this.state.isAPIcalled}
          onClick={() => {
            if (!this.state.isOpenDrawer)
              this.setState({ chosenModel: model, isConfirmLoad: true });
          }}
        />
      );
    });
  };

  /** Methods related to Drawer */
  private handleOpenDrawer = async (model: RegisteredModel) => {
    await this.setState({ isOpenDrawer: true, chosenModel: model });
    this.handleGetModelTags();
  };

  private handleCloseDrawer = () => {
    this.setState({ isOpenDrawer: false, chosenModel: undefined });
  };

  private handleDrawerTabChange = (tabId: TabId) =>
    this.setState({ drawerTabId: tabId });

  private handleRegistrationTabChange = (tabId: TabId) => {
    this.setState({
      formData: {
        type: tabId.toString(),
        name: "",
        description: "",
        directory: "",
        modelKey: "",
        projectSecret: "",
      },
      registrationTabId: tabId,
    });
  };

  private handleGetTagHashColour = (tagid: number): string => {
    return TagColours[tagid % TagColours.length];
  };

  /** Miscellaneous methods */
  private formatLongStringName = (str: string, length: number) => {
    if (str.length > length) {
      return `${str.substring(0, length - 1)}..`;
    }
    return str;
  };

  private handleElectronChangeDirListener = (event: any, args: string[]) => {
    this.setState(prevState => {
      // eslint-disable-next-line prefer-const
      let form: any = prevState.formData;
      // eslint-disable-next-line prefer-destructuring
      form.directory = args[0];
      return { formData: form };
    });
  };

  async componentDidMount(): Promise<void> {
    await this.handleRefreshModelList();
    if (this.state.registeredModelList !== {}) {
      this.handleGetLoadedModel();
    }
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.on("select-dirs-reply", this.handleElectronChangeDirListener);
    }
  }

  componentWillUnmount(): void {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.removeListener(
        "select-dirs-reply",
        this.handleElectronChangeDirListener
      );
    }
  }

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

    const registerModelForm = (
      <div className={classes.RegistrationForm}>
        {this.state.registrationTabId === "hub" ? (
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
        <FormGroup label="Folder Path" labelFor="label-input">
          <InputGroup
            id="directory"
            name="directory"
            value={this.state.formData.directory}
            placeholder={
              this.state.registrationTabId === "hub"
                ? "Enter the folder path to save the model..."
                : "Enter model folder path..."
            }
            onChange={this.handleChangeForm}
            rightElement={isElectron() ? browseButton : browseHint}
          />
        </FormGroup>
        <FormGroup label="Description" labelFor="label-input">
          <TextArea
            placeholder="Optional"
            className="bp3-fill"
            growVertically={false}
            small
            intent={Intent.PRIMARY}
            name="description"
            value={this.state.formData.description}
            onChange={this.handleChangeForm}
          />
        </FormGroup>
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
            {/* <Icon icon="draw" /> */}
            About Model
          </h6>
          <p className="bp3-running-text">
            {this.state.chosenModel?.description}
          </p>

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
        <div>
          <ControlGroup className={classes.Right}>
            <Button
              minimal
              type="button"
              text="Unload"
              disabled={
                this.state.chosenModel?.hash !==
                  this.state.currentModel?.hash || this.state.isUnloadModelAPI
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
                minimal
                type="button"
                disabled={this.state.isAPIcalled}
                icon="trash"
                onClick={() => {
                  this.setState({ isConfirmDelete: true });
                }}
              />
            </Popover>
          </ControlGroup>
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
                    <Tab id="hub" title="Hub" />
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
