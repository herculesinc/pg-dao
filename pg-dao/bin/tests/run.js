// IMPORTS
// ================================================================================================
var pgdao = require('./../index');
var TestSetup_1 = require('./TestSetup');
// TEST
// ================================================================================================
var cnSettings = {
    host: 'credodb.cloudapp.net',
    port: 5432,
    user: 'credoadmin',
    password: 'e64FB=%KWL-]',
    database: 'credo_dev'
};
var selectAccountTokens = new TestSetup_1.qSelectAccountTokens(1, true);
console.log('Getting connection');
pgdao.connect(cnSettings).then(function (dao) {
    return dao.startTransaction()
        .then(function () { return updateToken(dao); })
        .then(function () { return dao.release(); });
});
function updateToken(dao) {
    console.log('Executing queries');
    return dao.execute(selectAccountTokens).then(function (results) {
        console.log('Query executed');
        var token = results[0];
        token.status = 2;
        dao.save(token);
        return dao.sync(dao.inTransaction).then(function (info) {
            console.log('Sync completed');
        }).catch(function (reason) {
            console.log(reason.message);
        });
    });
}
//# sourceMappingURL=run.js.map