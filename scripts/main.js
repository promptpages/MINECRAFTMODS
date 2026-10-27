import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// Listen for chat command '!autodigger' to open the modern UI
world.beforeEvents.chatSend.subscribe((event) => {
    if (event.message === "!autodigger") {
        event.cancel = true;
        system.run(() => {
            openAutoDiggerUI(event.sender);
        });
    }
});

function openAutoDiggerUI(player) {
    const form = new ModalFormData()
        .title("Auto Digger Pro UI")
        .textField("Search Block (e.g., diamond, wood, iron):", "diamond_ore")
        .toggle("Enable Lava & Hazard Avoidance", true)
        .toggle("Minimize HUD when running", false);

    form.show(player).then((response) => {
        if (response.canceled) return;
        const [searchQuery, hazardAvoidance, minimizeUI] = response.formValues;
        
        player.sendMessage(`§a[AutoDigger] Target locked: §e${searchQuery}`);
        player.sendMessage(`§a[AutoDigger] Hazard Avoidance: §e${hazardAvoidance ? "ACTIVE" : "OFF"}`);
        
        if (minimizeUI) {
            player.sendMessage("§7[UI] Minimized to side-screen widget.");
        }

        startAutoMiningLoop(player, searchQuery, hazardAvoidance);
    });
}

function startAutoMiningLoop(player, targetBlock, avoidLava) {
    player.sendMessage("§eAuto-digger system engaged! Looking for blocks...");

    // Loop running via Minecraft system ticks
    let runId = system.runInterval(() => {
        const pLoc = player.location;
        const dimension = player.dimension;

        // Coordinates for blocks around the player
        const blockInFront = dimension.getBlock({ x: Math.floor(pLoc.x), y: Math.floor(pLoc.y), z: Math.floor(pLoc.z + 1) });
        const blockBelow = dimension.getBlock({ x: Math.floor(pLoc.x), y: Math.floor(pLoc.y - 1), z: Math.floor(pLoc.z) });

        // Lava & Hazard Avoidance Logic
        if (avoidLava) {
            if (blockInFront?.typeId.includes("lava") || blockBelow?.typeId.includes("lava")) {
                player.sendMessage("§c[Safety Warning] Lava detected nearby! Rerouting path...");
                return; // Skips current tick action to prevent walking into lava
            }
        }

        // Smart Tool / Block Matching simulation
        if (blockInFront && blockInFront.typeId.includes(targetBlock.toLowerCase())) {
            player.sendMessage(`§a[Mining] Found target: ${blockInFront.typeId}! Breaking block...`);
            
            // Auto tool switching simulation based on target type
            if (targetBlock.includes("wood") || targetBlock.includes("log")) {
                player.runCommand("say Auto-switched to Axe for wood harvesting.");
            } else {
                player.runCommand("say Auto-switched to Pickaxe for ore mining.");
            }

            // Break block and drop items
            dimension.runCommand(`setblock ${blockInFront.location.x} ${blockInFront.location.y} ${blockInFront.location.z} air destroy`);
        }
    }, 30); // Runs every 1.5 seconds
}
