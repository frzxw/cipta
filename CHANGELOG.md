# Changelog

## 1.0.0 (2026-04-17)


### Features

* add configuration files for linting, formatting, and testing ([b305119](https://github.com/frzxw/cipta/commit/b305119ae6e006e913bcf05b06208af0cb0c56c5))
* **api:** initialize NestJS application with basic structure and configuration files ([a014f68](https://github.com/frzxw/cipta/commit/a014f6885ddb15f9ac712cae28e0fe3ad5167999))
* **database:** configure prisma schema models ([#53](https://github.com/frzxw/cipta/issues/53)) ([d0fc70a](https://github.com/frzxw/cipta/commit/d0fc70a889c441e6b295207747e9e33c071af294)), closes [#1](https://github.com/frzxw/cipta/issues/1)
* **database:** run initial migration and add TS seed script ([#57](https://github.com/frzxw/cipta/issues/57)) ([b604b6c](https://github.com/frzxw/cipta/commit/b604b6c0a82bcfe5bee739077c1a3a14a49b1894))
* **docs:** add copilot instructions ([0b29f74](https://github.com/frzxw/cipta/commit/0b29f74858c3eaff672282e723b6beb194947706))
* **docs:** establish comprehensive agent rules for documentation management ([ccc04c6](https://github.com/frzxw/cipta/commit/ccc04c6a944351d5e334342124862d1e43e636bd))
* **husky:** add commit-msg and pre-commit hooks for linting ([5348c7b](https://github.com/frzxw/cipta/commit/5348c7ba763101801037d155eb5c4470e63ea009))
* **infra:** setup Docker Compose for Postgres and Redis ([#56](https://github.com/frzxw/cipta/issues/56)) ([8ded851](https://github.com/frzxw/cipta/commit/8ded8518ec78b6ad5b84b77049823d83962fb30b)), closes [#5](https://github.com/frzxw/cipta/issues/5)
* **shared:** add queue and job contracts ([#58](https://github.com/frzxw/cipta/issues/58)) ([3a47a2b](https://github.com/frzxw/cipta/commit/3a47a2b82c058848fe55e1c7daf32357de87af59)), closes [#3](https://github.com/frzxw/cipta/issues/3)
* **shared:** Configure typescript-config and eslint-config ([#55](https://github.com/frzxw/cipta/issues/55)) ([6cac658](https://github.com/frzxw/cipta/commit/6cac658ceb3c1c0fb3ef6b6ad45636791a8e2b06))
* **skills:** add caveman skill for token-efficient communication mode ([2b97ca7](https://github.com/frzxw/cipta/commit/2b97ca78bd9e77360699aba786487d15b2fcd822))
* **skills:** add comprehensive Supabase Postgres best practices documentation and skill definition ([ee4f1fd](https://github.com/frzxw/cipta/commit/ee4f1fdca7a482d9cf17db17d4fd06ebdcb2c35d))
* **skills:** add curated skills for AI assisted development ([3165a62](https://github.com/frzxw/cipta/commit/3165a626aab99e85c0b5b0418fc83c3dffd1ef1b))
* **skills:** add documentation for refactoring and GitHub issues skills ([4d56dd2](https://github.com/frzxw/cipta/commit/4d56dd22edbfa7356d5632f5cd19d13a8fb064ae))


### Bug Fixes

* **api:** update tsconfig to include ignoreDeprecations option ([957e389](https://github.com/frzxw/cipta/commit/957e389c6c90fc46962250fad9e42ac289bef5c6))
* downgrade ignoreDeprecations to 5.0 ([6fa14c0](https://github.com/frzxw/cipta/commit/6fa14c030c3d95b179570472ba7e887fe3b83350))
* **lint:** update markdown linting configuration to ignore .agents directory ([4ac0863](https://github.com/frzxw/cipta/commit/4ac086317e21f5c394de7927b4dd04743e398bd5))
