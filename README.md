HumanDiff
=========

> Diff to human-readable differences file.

Produces human readable / editable "diff" files similar to those generated by
most VCS to aid conflict resolution intended to facilitate the task of merging
two different files without having them under any version control system.


Installation
------------

    npm install -g humandiff


Usage
-----

    Usage: humandiff [options] <oldFile> <newFile> [oldFileLabel] [newFileLabel]

    Human readable "diff" tool with no data loss.

      Differenced sections are labeled with oldFileLabel and newFileLabel if provided.

      File path is used otherwise.


    Options:

      -V, --version                      output the version number
      -o, --acceptOld <cfgOptions_list>  Comma-separated list of options to automatically accept old version
      -n, --acceptNew <cfgOptions_list>  Comma-separated list of options to automatically accept new version
      -i, --ignoreCase                   Perform case-insensitive comparsion
      -h, --help                         output usage information


    Exit statuses:
       Possible return status codes are:

          0: Ok
             Compare files are identical (~diff)
             ...OR if conflicts were automatically resolved.
          1: Conflict
             Files differ (~diff)
             ...AND conflicts couldn't automatically resolved.
                (Output file needs human review)
          2: Binary
             Tryed to compare binary file (=diff)
             (RESERVED, but Not yet used)
          5: Error
             Some error happened.
             (Details logged to stderr)

       NOTE: Defined as close as possible to diff exit status.
       See: http://tldp.org/LDP/abs/html/filearchiv.html#DIFFERR2


    Advanced features:

      Automated resolution:
          Given any differnce section, if it consists in single row both sides
          and both consists in property definiton of the form 'propName = xxxx'.
          If propName is present on --acceptOld or --acceptNew list, proper
          version is automatically selected (printed) and no conflict block is
          rendered. It also works if property is not present either side (was
          removed or added in newFile) or, sometimes, even if its position changes
          (removed from its original position and added in another place).

      Case insensitive comparsion:
          if --ignoreCase option (or -i) option is used, case-insensitive
          comparsion is performed. In this mode, propNames in --acceptOld and
          --acceptNew are threaten in case insensitive manner so, for example
          "someoption" and "SomeOption" property names are considered the same
          and thus selected version is picked (in its original case). In case of
          rows with no other difference than upper/lower-case letters, oldFile
          verison is used


Output example
--------------

      Diff example file.

      This row is the same.

      <<<<<<<< test/a.txt
      This row is not the same.
      ========
      This row is different.
      >>>>>>>> test/b.txt

      This is also the same.
      And this too.

      <<<<<<<< test/a.txt
      This row is missing.
      ========
      >>>>>>>> test/b.txt

      More data.

      <<<<<<<< test/a.txt
      ========
      This row is added.
      >>>>>>>> test/b.txt

      And much more data.

      <<<<<<<< test/a.txt
      More differences.
      ========
      Another different block.
      This also added more rows.
      >>>>>>>> test/b.txt

      And much more data again.


More...
-------

See [ CHANGELOG ](./CHANGELOG.txt) file.


License
-------

[ GNU GENERAL PUBLIC LICENSE ](./LICENSE.txt)


This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).


<a name="contributing"></a>Contributing
---------------------------------------

If you are interested in contributing with this project, you can do it in many ways:

  * Creating and/or mantainig documentation.

  * Implementing new features or improving code implementation.

  * Reporting bugs and/or fixing it.
  
  * Sending me any other feedback.

  * Whatever you like...
    
Please, contact-me, open issues or send pull-requests thought [this project GIT repository](https://github.com/bitifet/humandiff)


