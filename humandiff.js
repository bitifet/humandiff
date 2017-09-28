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
const __options__ = {
    ignoreCase: false, // FIXME: Make it optional (by parameter).
};

function exitError(msg) { // Simple error message and exit helper.//{{{
    console.error("ERROR: " + msg);
    process.exit(1);
};//}}}

function sideRender(sideRows) { // Simple token-side rows render helper.//{{{
    for (let i=0; i<sideRows.length; i++) {
        console.log(sideRows[i]);
    };
    return true; // Success.
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
        , {
            context: 0,
            ignoreCase: __options__.ignoreCase,
        }
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
                ti++;
                tok[ti] = {
                    i: ti, // FIXME!! Check if it is finally needed.
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

    // Detect last row trailing newline difference:
    // (This is detected by StrDiff() but indistinguishable in its output)
    const trailMsg = "No trailing newline";
    let f1_trailing_nl = (f1.data[f1.data.length -1] == "\n");
    let f2_trailing_nl = (f2.data[f2.data.length -1] == "\n");
    if (f1_trailing_nl && ! f2_trailing_nl) tok[ti].nmeta = trailMsg;
    if (f2_trailing_nl && ! f1_trailing_nl) tok[ti].ometa = trailMsg;

    return tok.map(function propertyDetection(t){

            // Capture property name on sides having single meaningful row:
            ["old", "new"].map(function(brand){

                // Get meaningful rows:
                let mrowsArr = t[brand].filter(x=>x.trim().length);

                // Annotate meaningful rows count:
                t[brand+"mrows"] = mrowsArr.length;

                // oldProp / newProp property names:
                let propName = ((mrowsArr[0] || "").match(/^\s*(\w+)\s*=/) || [])[1];
                if (propName && __options__.ignoreCase) propName = propName.toLowerCase();
                t[brand+"Prop"] = (t[brand+"mrows"] == 1)
                    ? propName
                    : undefined
                ;
            });

            return t;

    });

};//}}}

function buildMaster(fileContents) {//{{{

    // Avoid trailing newline character to generate fake extra row.
    let least = fileContents.length -1;
    if (fileContents[least] == "\n") fileContents = fileContents.substring(0, least);

    // Return array of rows.
    return fileContents.split("\n");

    // NOTE: All rows in text file are supposed to end in newline character even it is
    //       not included.
    //       But for last row this can be not true. If that happen just in one
    //       of the input files it will be detected as a difference (and
    //       corresponding token get generated). But its text representation
    //       will be identical except for an extra 'ometa' property warning of
    //       that situation.

};//}}}

function matchProps(cmd, tokens) {//{{{

    // Build acceptList index:
    // -----------------------
    var acceptList = {
        old: {},
        new: {},
    };
    ["old", "new"].map(function(brand){
        let bKey = "accept" // acceptOld / acceptNew
            +brand[0].toUpperCase()
            +brand.substring(1)
        ;
        (cmd[bKey] || "")
            .split(/\s*,\s*/)
            .filter(x=>x)
            .map(function(propName){
                if (__options__.ignoreCase) propName = propName.toLowerCase();
                acceptList[brand][propName]=true;
                if (brand == "new") { // old already fully filled.
                    // Check for repetitions.
                    if (acceptList.old[propName]) exitError (
                        "\""+propName+"\" property name present in both --acceptOld and --acceptNew lists."
                    );
                };
            })
        ;
    });

    // Convert to arrays after classify/check:
    acceptList.old = Object.keys(acceptList.old);
    acceptList.new = Object.keys(acceptList.new);

    [
        [ "old", "new" ],
        [ "new", "old" ],
    ]
    .map(function(brands){ // function([ brand, counterbrand ])
        var brand = brands[0];
        var counterbrand = brands[1];

        // Check brand against counterbrand.
        acceptList[brand].map(function(propName){

            if (__options__.ignoreCase) propName = propName.toLowerCase();

            let bProp = brand+"Prop";
            let cProp = counterbrand+"Prop";
            let bmrows = brand+"mrows";
            let cmrows = counterbrand+"mrows";

            // Pick matching tokens both sides (brand / counterbrand):
            let bts = tokens.filter(t=>t[bProp]==propName);
            let cts = tokens.filter(t=>t[cProp]==propName);
            let bt = bts[0];
            let ct = cts[0];

            if (bts.length == 1) { // Single (brand side) match.

                if ( // Property is added (new side) or removed (old side).
                    cts.length == 0 // No counterpart match.
                    && bt[bmrows] // Counterpart side is empty.
                ) {
                    bt.selected = brand;
                }
                else if ( // Property is modified (even if moved)
                    cts.length == 1 // Single couterpart match.
                ) {
                    if (bt.i == ct.i) { // Same token.
                        bt.selected = brand; // Mark as selected.
                    } else if (
                        // (distinct token)
                        bt[cmrows] == 0 // No meaningful data in brand token counterbrand part.
                        && ct[bmrows] == 0 // No meaningful data in counterbrand token brand part.
                    ) {
                        bt.selected = brand; // Actual version.
                        ct.selected = brand; // Empty version.
                    }
                };
            } else if (
                bts.length == 0 // No brand side match.
                && cts.length == 1 // Single counterpart match.
                && ct[cmrows] // Counterpart brand side is empty.
            ) {
                ct.selected = brand;
            };

        });

    });

};//}}}


// "Program" (commander module) definition.
// ========================================
Program
  .version(Pkg.version)
    .arguments('<oldFile> <newFile> [oldFileLabel] [newFileLabel]')
    .option('-o, --acceptOld <cfgOptions_list>', 'Comma-separated list of options to automatically accept old version')
    .option('-n, --acceptNew <cfgOptions_list>', 'Comma-separated list of options to automatically accept new version')
    .option('-i, --ignoreCase', 'Perform case-insensitive comparsion')
    .description([
        'Human readable "diff" tool with no data loss.',
        'Differenced sections are labeled with oldFileLabel and newFileLabel if provided.',
        'File path is used otherwise.',
    ].join("\n\n    "))
    .on('--help', function(){
        const tab = "\n  ";
        console.log(tab+[
            "Advanced features:",
            "",
            "  Automated resolution:",
            "      Given any differnce section, if it consists in single row both sides",
            "      and both consists in property definiton of the form 'propName = xxxx'.",
            "      If propName is present on --acceptOld or --acceptNew list, proper",
            "      version is automatically selected (printed) and no conflict block is",
            "      rendered. It also works if property is not present either side (was",
            "      removed or added in newFile) or, sometimes, even if its position changes",
            "      (removed from its original position and added in another place).",
            "",
            "  Case insensitive comparsion:",
            "      if --ignoreCase option (or -i) option is used, case-insensitive",
            "      comparsion is performed. In this mode, propNames in --acceptOld and",
            "      --acceptNew are threaten in case insensitive manner so, for example",
            "      \"someoption\" and \"SomeOption\" property names are considered the same",
            "      and thus selected version is picked (in its original case). In case of",
            "      rows with no other difference than upper/lower-case letters, oldFile",
            "      verison is used",
            "",
        ].join(tab));

    })
    .action(main)
;
Program.parse(process.argv);
// ========================================



function main(file1, file2, file1Label, file2Label, cmd){

    mainRun = true; // Flag.
    if (cmd.ignoreCase) __options__.ignoreCase = true;

    const files = loadFiles([file1, file2], [file1Label, file2Label]);

    const master = buildMaster(files[0].data);
    const tokens = tokenDiff(files[0], files[1]) // Get diff tokens.
        .concat([{}]) // Add empty token as "graceful" end-of-list mark.
    ;

    // Perform --acceptOld and --acceptNew automations:
    matchProps(cmd, tokens);

    let ti = 0, t = tokens[ti];

    for (let mi = 0; mi<master.length; mi++) {

        if (mi == t.ostart) {

            // Actual differences block renderization:
            // ---------------------------------------
            if (t.selected) {
                sideRender(t[t.selected]);
            } else {
                console.log (____topRuler____ + " " + files[0].label);
                sideRender(t.old);
                if (t.ometa) console.log ("\\ " + t.ometa);
                console.log (____medRuler____);
                sideRender(t.new);
                if (t.nmeta) console.log ("\\ " + t.nmeta);
                console.log (____botRuler____ + " " + files[1].label);
            };

            mi += t.old.length -1; // Bypass in master but fix next loop increment.
            t = tokens[++ti];
            // NOTE: When final empty token is reached t.ostart = undefined.
            //   ...So (mi == t.ostart) condition will evaluate false from then on.
            // ---------------------------------------

        } else {
            console.log(master[mi]);
        };

    };

    // Detect if not all tokens were processed (Sanity check).
    if (ti < tokens.length -1) exitError("Unprocessed tokens left!!");


};


if (! mainRun) Program.outputHelp();
