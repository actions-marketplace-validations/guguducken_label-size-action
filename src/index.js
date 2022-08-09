const core = require('@actions/core');
const github = require('@actions/github');

// const github_token = core.getInput("SIZE_TOKEN");

async function run() {

    try {
        //get a octokit client
        // const octokit = github.getOctokit(github_token);

        //get github context
        const context = github.context;

        //get pull request num
        const num = context.payload?.pull_request?.number;

        const labels = context.payload?.pull_request?.labels;

        for (const label of labels) {
            const { name } = label;
            core.info(name === "kind/bug");
        }
    } catch (err) {
        core.setFailed(err.message);
    }
}

run();