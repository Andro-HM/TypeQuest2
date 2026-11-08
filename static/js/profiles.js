const profileModal = document.getElementById("profile-modal");
const profileInput = document.getElementById("profile-input");
const profileAction = document.getElementById("profile-action");
const editProfileId = document.getElementById("edit-profile-id");

function openProfileModal(action, id, name)
{
    profileAction.value = action;
    editProfileId.value = id;
    profileInput.value = name;
    profileInput.required = action !== "delete";
    document.getElementById("name-fields").hidden = action === "delete";
    document.getElementById("modal-error").hidden = true;
    document.getElementById("modal-title").textContent = "Create a profile";
    document.getElementById("modal-description").textContent = "Give your player a name.";
    document.getElementById("modal-submit").textContent = "Create & switch";

    if (action === "rename")
    {
        document.getElementById("modal-title").textContent = "Rename profile";
        document.getElementById("modal-submit").textContent = "Save name";
    }
    else if (action === "delete")
    {
        document.getElementById("modal-title").textContent = "Delete profile?";
        document.getElementById("modal-description").textContent = "Delete “" + name + "” and all of this player's saved progress? This cannot be undone.";
        document.getElementById("modal-submit").textContent = "Delete profile";
    }

    profileModal.hidden = false;
    if (action !== "delete")
    {
        profileInput.focus();
        profileInput.select();
    }
}

function closeProfileModal()
{
    profileModal.hidden = true;
    document.getElementById("create-profile").focus();
}

function openCreateProfile()
{
    openProfileModal("create", "", "");
}

function handleProfileAction(event)
{
    const button = event.currentTarget;
    openProfileModal(button.dataset.action, button.dataset.id, button.dataset.name);
    button.closest("details").open = false;
}

function handleModalBackdrop(event)
{
    if (event.target === profileModal)
    {
        closeProfileModal();
    }
}

function handleModalKey(event)
{
    if (event.key === "Escape" && !profileModal.hidden)
    {
        closeProfileModal();
    }
}

document.getElementById("create-profile").addEventListener("click", openCreateProfile);
document.getElementById("modal-close").addEventListener("click", closeProfileModal);
document.getElementById("modal-cancel").addEventListener("click", closeProfileModal);
profileModal.addEventListener("click", handleModalBackdrop);
document.addEventListener("keydown", handleModalKey);
const profileActions = document.querySelectorAll("[data-action]");
for (let i = 0; i < profileActions.length; i++)
{
    profileActions[i].addEventListener("click", handleProfileAction);
}
if (!profileModal.hidden)
{
    profileInput.focus();
}
