const core = require('@actions/core');
const github = require('@actions/github');

const github_token = core.getInput("size_token", { required: true });
const ignoreStr = core.getInput("ignore");
const labelSize = JSON.parse(core.getInput("sizes"));

async function run() {

    try {
        //get a octokit client
        const octokit = github.getOctokit(github_token, { userAgent: "guguducken/label-size-action" });

        //get github context
        const context = github.context;

        //get pull request num
        const num = context.payload?.pull_request?.number;

        if (num == undefined) {
            core.info("This job is not triggered by PR");
            return
        }

        core.info("----------------------------Labeler Start---------------------------");

        //get repo and owner
        const repo_name = context.repo.repo;
        const repo_owner = context.repo.owner;

        core.info(`The target repository name is: ` + repo_name);
        core.info(`The owner of this repository is: ` + repo_owner);
        core.info(`The PR number of this job is: ` + num);
        let ignore_re = getIgnoreRe(ignoreStr);

        //get files
        const { data: files } = await octokit.rest.pulls.listFiles(
            {
                ...context.repo,
                pull_number: num,
            }
        );

        //get labels of this PR 
        const { data: pr } = await octokit.rest.pulls.get(
            {
                ...context.repo,
                pull_number: num,
            }
        );
        let { labels } = pr;

        //get the size of file changes, additions and deletions
        const { changedSize, additions, deletions } = getChangeSize(files);
        core.info("The additions of this PR: " + additions);
        core.info("The deletions of this PR: " + deletions);
        core.info("The changedSize of this PR: " + changedSize);

        //get the label of size
        const label = getLabel(changedSize);

        core.info(label);

        //get the label which need to add and remove
        let { add, move } = getAddAndMove(labels, label);

        //check label status
        if (add.length == 0 && move.length == 0) {
            core.info("No New Label need to add and move");
            return;
        }

        //add label
        if (add.length != 0) {
            await octokit.rest.issues.addLabels(
                {
                    ...context.repo,
                    issue_number: num,
                    labels: add
                }
            )
        }

        //move label
        if (move.length != 0) {
            for (const label of move) {
                await octokit.rest.issues.removeLabel(
                    {
                        ...context.repo,
                        issue_number: num,
                        name: label
                    }
                )
            }
        }
    } catch (err) {
        core.setFailed(err.message);
    }
}

function getAddAndMove(labels, newLabel) {
    let add = [newLabel];
    let move = [];
    for (let i = 0; i < labels.length; i++) {
        const { name } = labels[i];
        if (name.startsWith("size/")) {
            if (name == newLabel) {
                add.pop();
            } else {
                move.push(name);
            }
        }
    }
    return { add, move }
}

function reParse(str) {
    let ans = "";
    for (let index = 0; index < str.length; index++) {
        const e = str[index];
        if (e == "/" || e == "{" || e == "}" || e == "[" || e == "]" ||
            e == "(" || e == ")" || e == "^" || e == "$" || e == "+" ||
            e == "\\" || e == "." || e == "*" || e == "|" || e == "?") {
            ans += "\\";
        }
        ans += e;
    }
    return ans
}

function getIgnoreRe(ignoreStr) {
    if (ignoreStr === "") {
        return undefined;
    }
    core.info(ignoreStr);
    let set_re = new Set();
    let t = "";
    for (let i = 1; i < ignoreStr.length - 1; i++) {
        const e = ignoreStr[i];
        if (e == ",") {
            if (t == "") {
                continue;
            }
            set_re.add(reParse(t));
            t = "";
        } else {
            t += e;
        }
    }
    if (t != "") {
        set_re.add(reParse(t));
    }
    if (set_re.size == 0) {
        return undefined
    }
    let ans_re = new Array();
    for (const re of set_re) {
        ans_re.push(new RegExp(re, "igm"));
    }
    for (const it of ans_re) {
        core.info(it.toString());
    }
    return ans_re
}

function getChangeSize(files, ignore) {
    let changedSize = 0;
    let additions = 0;
    let deletions = 0;
    if (ignore == undefined) {
        for (const file of files) {
            changedSize += file.changes;
            additions += file.additions;
            deletions += file.deletions;
        }
    } else {
        for (const file of files) {
            for (let re of ignore) {
                re.lastIndex = 0;
                if (re.test(file.filename)) {
                    changedSize += file.changes;
                    additions += file.additions;
                    deletions += file.deletions;
                }
            }
        }
    }
    return { changedSize, additions, deletions };
}

function getLabel(size) {
    let label = "";
    for (const tag of Object.keys(labelSize).sort((a, b) => { return labelSize[a] - labelSize[b] })) {
        if (size >= labelSize[tag]) {
            label = tag;
        }
    }
    return "size/" + label;
}

run();