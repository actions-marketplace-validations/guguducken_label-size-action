const core = require('@actions/core');
const github = require('@actions/github');

const github_token = core.getInput("size_token", { required: true });
const ignoreStr = core.getInput('ignore');
const labelSize = JSON.parse(core.getInput('size'));

async function run() {

    try {
        //get a octokit client
        const octokit = github.getOctokit(github_token, { userAgent: "guguducken/label-size-action" });

        //get github context
        const context = github.context;

        //get pull request num
        const num = context.payload?.pull_request?.number;

        //get repo and owner
        const repo_name = context.repo.repo;
        const repo_owner = context.repo.owner;

        let ignore_re = getIgnoreRe(ignoreStr);

        const { data: files } = await octokit.rest.pulls.listFiles(
            {
                ...context.repo,
                pull_number: num,
            }
        );
        core.info(JSON.stringify(files));

        const changeSize = getChangeSize(files);

        core.info("-----------------------------------------------------");
        core.info(changeSize);
        core.info("-----------------------------------------------------");
        core.info(labelSize);
    } catch (err) {
        core.setFailed(err.message);
    }
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
    let set_re = new Set();
    let t = "";
    for (let i = 0; i < ignoreStr.length; i++) {
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
    return ans_re
}

function getChangeSize(files, ignore) {
    let sum = 0;
    let additions = 0;
    let deletions = 0;
    if (ignore == undefined) {
        for (const file of files) {
            sum += file.changes;
            additions += file.additions;
            deletions += file.deletions;
        }
    } else {
        for (const file of files) {
            for (const re of ignore) {
                re.lastIndex = 0;
                if (re.test(file.filename)) {
                    sum += file.changes;
                    additions += file.additions;
                    deletions += file.deletions;
                }
            }
        }
    }
    return { sum, additions, deletions };
}

run();