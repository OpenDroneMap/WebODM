# Contributor Code of Conduct

As contributors and maintainers, we pledge to respect all people who contribute through reporting issues, posting feature requests, updating documentation, submitting pull requests or patches, and other activities.

We are committed to making participation in OpenDroneMap a harassment-free experience for everyone, regardless of level of experience, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, or religion.

Examples of unacceptable behavior by participants include the use of sexual language or imagery, derogatory comments or personal attacks, trolling, public or private harassment, insults, or other unprofessional conduct.

Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct. Project maintainers who do not follow the Code of Conduct may be removed from the project team.

This code of conduct applies both within project spaces and in public spaces when an individual is representing the project or its community.

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by opening an issue or contacting one or more of the project maintainers.

This Code of Conduct is adapted from the [Contributor Covenant](http://contributor-covenant.org), version 1.1.0, available at [http://contributor-covenant.org/version/1/1/0/](http://contributor-covenant.org/version/1/1/0/)

# Collective Code Construction Contract (C4)

## Definitions

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](http://tools.ietf.org/html/rfc2119).

## Rules

1.  The project SHALL use the git distributed revision control system.
2.  The project SHALL be hosted on github.com or equivalent, herein called the “Platform”.
3.  The project SHALL use the Platform issue tracker.
4.  The project SHOULD have clearly documented guidelines for code style.
5.  A “Contributor” is a person who wishes to provide a patch, being a set of commits that solve some clearly identified problem.
6.  A “Maintainer” is a person who merges patches to the project. Maintainers are not developers; their job is to enforce process.
7.  Contributors SHALL NOT have commit access to the repository unless they are also Maintainers.
8.  Maintainers SHALL have commit access to the repository.
9.  Everyone, without distinction or discrimination, SHALL have an equal right to become a Contributor under the terms of this contract.

### 2.2. Licensing and Ownership

1.  The project SHALL use a share-alike license such as the MPLv2, or a GPLv3 variant thereof (GPL, LGPL, AGPL), or a permissive license such as BSD.
2.  All contributions to the project source code (“patches”) SHALL use the same license as the project.
3.  All patches are owned by their authors. There SHALL NOT be any copyright assignment process.
4.  Each Contributor SHALL be responsible for identifying themselves in the project Contributor list.

### 2.3. Patch Requirements

1.  Maintainers and Contributors MUST have a Platform account and SHOULD use their real names or a well-known alias.
2.  A patch SHOULD be a minimal and accurate answer to exactly one identified and agreed problem.
3.  A patch MUST adhere to the code style guidelines of the project if these are defined.
4.  A patch MUST adhere to the “Evolution of Public Contracts” guidelines defined below.
5.  A patch SHALL NOT include non-trivial code from other projects unless the Contributor is the original author of that code.
6.  A patch MUST compile cleanly and pass project self-tests on at least the principal target platform.
7.  A “Correct Patch” is one that satisfies the above requirements.

### 2.4. Development Process

1.  Change on the project SHALL be governed by the pattern of accurately identifying problems and applying minimal, accurate solutions to these problems.
2.  To request changes, a user SHOULD log an issue on the project Platform issue tracker.
3.  The user or Contributor SHOULD write the issue by describing the problem they face or observe.
4.  The user or Contributor SHOULD seek consensus on the accuracy of their observation, and the value of solving the problem.
5.  Users SHALL NOT log feature requests, ideas, suggestions, or any solutions to problems that are not explicitly documented and provable.
6.  Thus, the release history of the project SHALL be a list of meaningful issues logged and solved.
7.  To work on an issue, a Contributor SHALL fork the project repository and then work on their forked repository.
8.  To submit a patch, a Contributor SHALL create a Platform pull request back to the project.
9.  A Contributor SHALL NOT commit changes directly to the project.
10.  If the Platform implements pull requests as issues, a Contributor MAY directly send a pull request without logging a separate issue.
11.  To discuss a patch, people MAY comment on the Platform pull request, on the commit, or elsewhere.
12.  To accept or reject a patch, a Maintainer SHALL use the Platform interface.
13.  Maintainers SHOULD NOT merge their own patches except in exceptional cases, such as non-responsiveness from other Maintainers for an extended period (more than 1-2 days).
14.  Maintainers SHALL NOT make value judgments on correct patches.
15.  Maintainers SHALL merge correct patches from other Contributors rapidly.
16.  Maintainers MAY merge incorrect patches from other Contributors with the goals of (a) ending fruitless discussions, (b) capturing toxic patches in the historical record, (c) engaging with the Contributor on improving their patch quality.
17.  The user who created an issue SHOULD close the issue after checking the patch is successful.
18.  Any Contributor who has value judgments on a patch SHOULD express these via their own patches.
19.  Maintainers SHOULD close user issues that are left open without action for an uncomfortable period of time.

### 2.5. Branches and Releases

1.  The project SHALL have one branch (“master”) that always holds the latest in-progress version and SHOULD always build.
2.  The project SHALL NOT use topic branches for any reason. Personal forks MAY use topic branches.
3.  To make a stable release a Maintainer shall tag the repository. Stable releases SHALL always be released from the repository master.

### 2.6. Evolution of Public Contracts

1.  All Public Contracts (APIs or protocols) SHALL be documented.
2.  All Public Contracts SHOULD have space for extensibility and experimentation.
3.  A patch that modifies a stable Public Contract SHOULD not break existing applications unless there is overriding consensus on the value of doing this.
4.  A patch that introduces new features SHOULD do so using new names (a new contract).
5.  New contracts SHOULD be marked as “draft” until they are stable and used by real users.
6.  Old contracts SHOULD be deprecated in a systematic fashion by marking them as “deprecated” and replacing them with new contracts as needed.
7.  When sufficient time has passed, old deprecated contracts SHOULD be removed.
8.  Old names SHALL NOT be reused by new contracts.

### 2.7. Project Administration

1.  The project founders SHALL act as Administrators to manage the set of project Maintainers.
2.  The Administrators SHALL ensure their own succession over time by promoting the most effective Maintainers.
3.  A new Contributor who makes correct patches, who clearly understands the project goals, and the process SHOULD be invited to become a Maintainer.
4.  Administrators SHOULD remove Maintainers who are inactive for an extended period of time, or who repeatedly fail to apply this process accurately.
5.  Administrators SHOULD block or ban “bad actors” who cause stress and pain to others in the project. This should be done after public discussion, with a chance for all parties to speak. A bad actor is someone who repeatedly ignores the rules and culture of the project, who is needlessly argumentative or hostile, or who is offensive, and who is unable to self-correct their behavior when asked to do so by others.

## License
This document is loosely based on https://rfc.zeromq.org/spec/42/

Copyright (c) 2009-2016 Pieter Hintjens.

This Specification is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

This Specification is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, see [http://www.gnu.org/licenses](http://www.gnu.org/licenses).