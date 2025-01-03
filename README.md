# DEMO
https://youtu.be/-0m7KJBmZus

## Configuring your environment

To start using this project, you need to get your development environment configured so that you can build and execute the code.
To do this, follow these steps; the specifics of each step will vary based on your operating system:

1. [Install git](https://git-scm.com/downloads) (v2.X). You should be able to execute `git --version` on the command line after installation is complete.

1. [Install Node LTS](https://nodejs.org/en/download/) (LTS: v18.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install) (1.22.X). You should be able to execute `yarn --version`.

1. Clone your repository by running `git clone REPO_URL` from the command line. You can get the REPO_URL by clicking on the green button on your project repository page on GitHub. Note that due to new department changes you can no longer access private git resources using https and a username and password. You will need to use either [an access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) or [SSH](https://help.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account).

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies.
In the project folder:

1. `yarn install` to download the packages specified in your project's *package.json* to the *node_modules* directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files. If it does not build locally, AutoTest will not be able to build it. This will also run formatting and linting, so make sure to fix those errors too!

1. `yarn test` to run the test suite.
    - To run with coverage, run `yarn cover`

1. `yarn prettier:fix` to format your project code.

1. `yarn lint:check` to see lint errors in your project code. You may be able to fix some of them using the `yarn lint:fix` command.



