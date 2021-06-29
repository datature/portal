## Nexus [Pre-Release Alpha]
![Build Tests](https://github.com/datature/Nexus/workflows/Build%20Tests/badge.svg)
![Code Style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
![Powered by NextJS](https://img.shields.io/npm/v/next?label=NextJS)

Nexus, a code-less cloud-based platform that allows researchers, entrepreneurs and students to create an industry-standard, customized computer vision capabilities using a deep learning backend.

### Overview
This repository contains the front-end code for Nexus and is powered by NextJS, TypeScript and Babel+WebPack. 
Nexus consists primarily of 3 parts:
- Annotator - An image annotation service that supports rectangles and polygons
- Flow - A blueprint-styled visual editor for pipeline orchestration 
- Deploy - Model deployment management and predictions insight tool

### Installing and Setup
Clone the project into your local repository. Once that is done, you should install the required deppendencies
```
npm install
```
You can run the project on your localhost for development purposes as such
```
npm run dev
```

### Commiting and Contribution
To ensure that we code on a homogeneous environment, setup your IDE with the following tools and rules.
```
npm i -D eslint prettier eslint-plugin-prettier eslint-config-prettier eslint-plugin-node eslint-config-node
npx install-peerdeps --dev eslint-config-airbnb
```
Prior to making a pull request, ensure that your codes are error free from Prettier, ESLint and TSC. You SHOULD run preflight checks prior to making a pull request as documented in this [page](https://www.notion.so/datature/Pre-Flight-Checks-bb3757dfd38f4a8d830aeedccac150e8).

Preflight check can be executed with:
```
npm run preflight
```
