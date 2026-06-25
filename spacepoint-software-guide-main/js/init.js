/**
 * SpacePoint Software Guide Platform
 * init.js - Global Data Initialization
 */

window.spacePointData = {
    categories: [],
    resources: {}
};

window.getUserType = function() {
    const user = JSON.parse(localStorage.getItem('spacePointUser'));
    return user ? user.type : null; // 'school' or 'uni'
};
