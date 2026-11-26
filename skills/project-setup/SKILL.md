---
name: project-setup
description: Onboard a new or existing project into NED by gathering its purpose and essential resources, requesting scoped access, and registering a persistent project knowledge folder.
---

# Set up a project in NED

1. Ask for the project name and purpose, what the operator wants NED to administer or develop, and the locations of the essential resources. Start with the repository, hosting environment, or other resources that the requested work actually needs. Reuse known details. Ask for the intended project when multiple projects fit.
2. Use the instance's persistent projects root. The standard NED container mounts it at `/projects`. In a native deployment use the known persistent workspace selected by the operator. Resolve an existing registration before creating a directory. For a new folder use a stable lowercase slug with letters, digits and hyphens, starting with a letter or digit. Use a direct child of the root and reject symlinks or paths that resolve outside it. Leave existing code and notes intact.
3. Create or update `PROJECT.md` there. Record the purpose, intended work, and non-secret resource inventory with the requested access and its status. Do not record credentials, one-time codes, secret URLs, or assumptions about what a granted account can do.
4. Run `ned task init --project <absolute-folder> --actor agent:project-setup --json` to register the folder through the authenticated Core task-management API. Use the runtime and database of the active NED instance. Check `ned status --project <absolute-folder> --actor agent:project-setup --json` and report the returned project identity. Reuse the same folder on retry. If registration fails, report that the notes exist and registration is pending. Keep database writes through the official CLI.
5. For each essential resource check current access with the applicable identity skill. Use guarded IFA where required by the profile. For supported providers, use the existing Hermes `ned` provider-auth action to open the private in-context connection UI when access is missing. Ask for the narrowest sufficient grant and use a harmless read to verify the identity and scope after consent. If unsupported, describe which permission remains pending and use the provider-approved handoff. Keep credential entry out of chat.
6. Report where the project is registered, what access was verified, and what still needs operator action. For development work, load task-management and create the relevant goal or task in the same registered project before implementing it.
