var serialization_1 = require('./serialization');
// TEST
// ================================================================================================
var cnSettings = {
    host: 'credodb.cloudapp.net',
    port: 5432,
    user: 'credoadmin',
    password: 'e64FB=%KWL-]',
    database: 'credo_dev'
};
serialization_1.runTest(100);
serialization_1.runTest(10);
serialization_1.runTest(100);
serialization_1.runTest(1000);
serialization_1.runTest(10000);
serialization_1.runTest(100000);
/*
var selectAccountTokens = new qSelectAccountTokens(5, false);

console.log('Getting connection');
pgdao.connect(cnSettings).then(function (dao) {

    return dao.execute([selectAccountTokens, selectAccountTokens, selectAccountTokens])
        .then((tokens) => {
            console.log('query executed: ' + JSON.stringify(tokens));
        });

    /*
    return dao.startTransaction()
        .then(() => updateToken(dao))
        .then(() => dao.release());
});

function updateToken(dao: Dao) {
    console.log('Executing queries');
    return dao.execute(selectAccountTokens).then(function (results) {
        console.log('Query executed');
        var token = results[0];

        token.status = 2;
        dao.save(token);

        return dao.sync(dao.inTransaction).then((info) => {
            console.log('Sync completed');
        }).catch((reason) => {
            console.log(reason.message);
        });
    });
}
*/ 
//# sourceMappingURL=run.js.map