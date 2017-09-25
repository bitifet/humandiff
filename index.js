#!/usr/bin/env node
"use strict";

const Program = require('commander');
const Fs = require("fs");
const StrDiff = require("diff").createTwoFilesPatch;
const Pkg = JSON.parse(Fs.readFileSync(__dirname + "/package.json").toString());

const ____topRuler____ = "<<<<<<<<";
const ____medRuler____ = "========";
const ____botRuler____ = ">>>>>>>>";


let mainRun = false;

function exitError(msg) { // Simple error message and exit helper.//{{{
    console.error(msg);
    process.exit(1);
};//}}}

function loadFiles(files, labels) {//{{{

    function reader(fPath, i) {
        try {
            return {
                label: labels[i] || fPath,
                data: Fs.readFileSync(fPath).toString(),
            };
        } catch (err) {
            exitError(err.message);
        };
    };

    return files.map(reader);

};//}}}

function tokenDiff(f1, f2) {//{{{

    let tok = [], ti = -1; // Tokens, index.
    let diff = StrDiff(
        ""
        , ""
        , f1.data
        , f2.data
        , ""
        , ""
        , {context: 0}
    )
    .split("\n")
    .slice(4)
    ;

    // Fix extra empty string on identical files:
    if (diff.length == 1 && diff[0] == "") diff = [];

    for (let i = 0; i < diff.length; i++) {
        let str = diff[i];
        switch (str[0]) {
            case "@": // Token header

                // Token header parsing (Expected format: '@@ -xx,lx +yy,ly @@').
                // let h = str.match(/^@@\s-(\d+),(\d+)\s\+(\d+),(\d+)\s@@$/); // (Verbose approach)
                let h = str.match(/^@@\s-(\d+),\d+\s\+\d+,\d+\s@@$/);
                if (!h) exitError("Wrong header format for token "+(++ti));

                // New token:
                tok[++ti] = {
                    // header: { // (Verbose approach)
                    //     oldStart: Number(h[1] - 1),
                    //     // oldLength: Number(h[1], // Same as tok[ti].old.lengh
                    //     // newStart: Number(h[3] - 1),  // Uneeded: We merge on "old" side basis.
                    //     // newLength: Number(h[1], // Same as tok[ti].new.lengh
                    // },
                    ostart: Number(h[1] - 1),
                    old: [],
                    new: [],
                };
                break;
            case "-":
                tok[ti].old.push(str.substring(1));
                break;
            case "+":
                tok[ti].new.push(str.substring(1));
                break;
        };
        if (ti<0 && diff.length) exitError("Missing starting token header");
    };

    return tok;

};//}}}

// "Program" (commander module) definition.
// ========================================
Program
  .version(Pkg.version)
    .arguments('<file1> <file2> [fileLabel1] [fileLabel2]')
    .description([
        'Human readable "diff" tool with no data loss.',
        'Differenced sections are labeled with fileLabel1 and fileLabel2 if provided.',
        'File path is used otherwise.',
    ].join("\n\n    "))
    .action(main)
;
Program.parse(process.argv);
// ========================================



function main(file1, file2, file1Label, file2Label, cmd){

    mainRun = true; // Flag.

    const files = loadFiles([file1, file2], [file1Label, file2Label]);

    const master = files[0].data.split("\n");
    const tokens = tokenDiff(files[0], files[1]) // Get diff tokens.
        .concat([{}]) // Add empty token as "graceful" end-of-list mark.
    ;
    let ti = 0, t = tokens[ti];

    for (let mi = 0; mi<master.length; mi++) {

        if (mi == t.ostart) {

            console.log (____topRuler____ + " " + files[0].label);
            for (let oi=0; oi<t.old.length; oi++) {
                console.log(t.old[oi]);
            };
            console.log (____medRuler____);
            for (let ni=0; ni<t.new.length; ni++) {
                console.log(t.new[ni]);
            };
            console.log (____botRuler____ + " " + files[1].label);

            mi += t.old.length -1; // Bypass in master but fix next loop increment.
            t = tokens[++ti];
            // NOTE: When final empty token is reached t.ostart = undefined.
            //   ...So (mi == t.ostart) condition will evaluate false from then on.

        } else {
            console.log(master[mi]);
        };

    };

    // Detect if not all tokens were processed (Sanity check).
    if (ti < tokens.length -1) exitError("Unprocessed tokens left!!");


};


if (! mainRun) Program.outputHelp();
