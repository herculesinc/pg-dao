function since(start) {
    var diff = process.hrtime(start);
    return (diff[0] * 1000 + diff[1] / 1000000);
}
var account = {
    type: "personal",
    status: "active",
    score: 65.56637882144256,
    profile: {
        name: {
            "firstName": "Irakliy",
            "lastName": "Khaburzaniya"
        },
        picture: {
            url: "http://credostore.blob.core.windows.net/prod-img/c4rkau1kcwwk4c9p6tn3gekgdru38cvqf8r3gt9k",
            source: "facebook",
            updatedOn: 1438238369629
        },
        location: {
            city: "Los Angeles",
            country: "United States"
        },
        age: {
            birthday: "1980-10-09",
            years: 34
        },
        gender: "male"
    },
    card: {
        cardId: "00215506796",
        status: "published",
        publicLens: {
            profile: {
                name: "firstName",
                picture: "none",
                gender: true,
                age: "range",
                location: "city"
            },
            verifications: {
                facebook: "friendCount"
            }
        },
        secretLens: {
            profile: {
                name: "fullName",
                picture: "urlOnly",
                gender: true,
                age: "year",
                location: "city"
            },
            verifications: {
                facebook: "friendCount"
            }
        }
    },
    spars: {
        facebook: {
            name: {
                firstName: "Irakliy",
                lastName: "Khaburzaniya"
            },
            pictureUrl: "http://credostore.blob.core.windows.net/prod-img/6cu32cht6rv3ccbj60w6ud9tcwr6achg70v6ee1g",
            location: {
                city: "Los Angeles",
                state: "California",
                country: "United States"
            },
            age: {
                birthday: "1981-10-09",
                years: 33
            },
            gender: "male",
            friends: 564,
            permissions: {
                friends: true,
                profile: true,
                birthday: true,
                location: true
            },
            status: "verified",
            capabilities: {
                canAuthenticate: true,
                hasProfilePicture: true
            },
            createdOn: 1437369193182,
            updatedOn: 1437369193182
        }
    },
    createdOn: 1437369193261,
    updatedOn: 1438238834735
};
var start = process.hrtime();
for (var i = 0; i < 100; i++) {
    account.score = i;
    var x = JSON.parse(JSON.stringify(account));
}
console.log(since(start));
//# sourceMappingURL=serialization.js.map