# Admin recover/delete state check

This project now treats Delete as a soft-delete into the Paper Trash unless the admin explicitly uses permanent deletion inside the Trash.

## Expected state movement

```text
submitted / rejected  --Delete-->  trash(deletedFrom=submitted/rejected)
accepted              --Delete-->  trash(deletedFrom=accepted)
published             --Delete-->  trash(deletedFrom=published)
unpublished           --Delete-->  trash(deletedFrom=unpublished)
```

Restore from Trash returns the record to its original section:

```text
trash(deletedFrom=submitted)    --Restore--> Submission management
trash(deletedFrom=rejected)     --Restore--> Rejected manuscripts
trash(deletedFrom=accepted)     --Restore--> Accepted papers
trash(deletedFrom=published)    --Restore--> Published manuscript management
trash(deletedFrom=unpublished)  --Restore--> Unpublished papers
```

Recover buttons move the manuscript one workflow step backward:

```text
rejected    --Recover--> submitted
accepted    --Recover--> submitted
published   --Recover--> accepted
unpublished --Recover--> published
```

## Safety fix added in v40

Earlier localStorage prototypes could remove a trash record before writing the restored copy into its destination list. v40 changes restore behavior so the destination write happens first. The record is removed from the Trash only after that write succeeds.

The Accepted-paper Delete/Recover functions also no longer fall back to the demo manuscript if the requested record cannot be found. If a record is missing, the admin receives an alert and no record is deleted.

## Production recommendation

When D1 is connected, all state transitions should be written as audit events rather than destructive updates. Permanent deletion should only affect records selected in the Trash and should still leave an audit record.
