module.exports = {
  repositoryUrl: "https://github.com/btwld/nestjs-worker.git",
  branches: [
    "main",
    "master",
    {
      name: "develop",
      prerelease: "dev",
      channel: "dev",
    },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle:
          "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
      },
    ],
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
        tarballDir: "dist",
      },
    ],
    [
      "@semantic-release/exec",
      {
        publishCmd:
          'cp package.json package.json.bak && jq \'.name = "@btwld/nestjs-worker" | .publishConfig.registry = "https://npm.pkg.github.com"\' package.json > package.json.tmp && mv package.json.tmp package.json && npm publish && mv package.json.bak package.json',
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "dist/*.tgz",
            label: "Distribution",
          },
        ],
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "CHANGELOG.md"],
        message: `chore(release): \${nextRelease.version} [skip ci]\n\n\${nextRelease.notes}`,
      },
    ],
  ],
};
