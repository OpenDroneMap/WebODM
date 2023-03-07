export default {
    userTags: function(tags){
        // Tags starting with a "." are considered hidden or system tags
        // and should not be displayed to end users via the UI
        if (Array.isArray(tags)){
            return tags.filter(t => !t.startsWith("."));
        }else return [];
    },

    systemTags: function(tags){
        if (Array.isArray(tags)){
            return tags.filter(t => t.startsWith("."));
        }else return [];
    },

    combine: function(user, system){
        if (Array.isArray(user) && Array.isArray(system)){
            return user.concat(system);
        }else throw Error("Invalid parameters");
    }
}