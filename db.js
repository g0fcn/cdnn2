var {Client} = require('pg');
client = new Client({
    host: process.env.host, user: process.env.user, password: process.env.password, port: parseInt(process.env.port)
});
client.connect();

function ParseOr(Str, queryls) {
    let orls = ''
    for (e in Str.split('or')) {
        let key = Str.split('or')[e].trim().split('=')[0].trim(), val = Str.split('or')[e].trim().split('=')[1].trim();
        if (/\'.*\'/.test(val)) {
            val = val.slice(1, val.length - 1)
        }
        if (val === "true" || val === "false") {
            val = (val === "true") ? true : false
        }
        if (/\d+/.test(val)) {
            val = parseInt(val)
        }
        queryls.push(val)
        val = queryls.length
        if (orls === '') {
            orls += key + ' = $' + val
        } else {
            orls += ' or ' + key + ' = $' + val
        }
    }
    return orls
} // 解析查询时的OR语句

module.exports = {
    client: client, add: function (tab_name, json) {
        keys = ''
        vals = ''
        valls = []
        for (i in json) {
            if (keys === '') {
                keys += i
            } else {
                keys += ', ' + i
            }
            valls.push(json[i])
            val = '$' + valls.length
            if (vals === '') {
                vals += val
            } else {
                vals += ', ' + val
            }
        }
        return new Promise(function (resolve, reject) {
            client.query(`INSERT INTO ${tab_name} (${keys})
                          VALUES (${vals})`, valls).then(function (sql) {
                resolve(sql);
            }).catch(function (err) {
                reject(err);
            })
        })
    }, del: function (tab_name, query = undefined) {
        queryls = []
        if (query.indexOf('and') !== -1) {
            let andls = ''
            for (i in query.split('and')) {
                if (query.split('and')[i].trim().indexOf('or') !== -1) {
                    andls += ParseOr(query.split('and')[i].trim(), queryls)
                } else {
                    let key = query.split('and')[i].trim().split('=')[0].trim(),
                        val = query.split('and')[i].trim().split('=')[1].trim()
                    if (/\'.*\'/.test(val)) {
                        val = val.slice(1, val.length - 1)
                    }
                    if (val === "true" || val === "false") {
                        val = (val === "true") ? true : false
                    }
                    if (/\d+/.test(val)) {
                        val = parseInt(val)
                    }
                    queryls.push(val)
                    val = queryls.length
                    if (andls === '') {
                        andls += key + ' = $' + val
                    } else {
                        andls += ' and ' + key + ' = $' + val
                    }
                }
            }
            query = andls
        } else {
            if (query.indexOf('or') !== -1) {
                query = ParseOr(query, queryls)
            } else {
                let val = query.split('=')[1].trim()
                if (/^\'.*\'$/.test(val)) {
                    val = val.slice(1, val.length - 1)
                }
                if (val === "true" || val === "false") {
                    val = (val === "true") ? true : false
                }
                if (/^\d+$/.test(val)) {
                    val = parseInt(val)
                }
                queryls.push(val)
                query = query.split('=')[0].trim() + ' = $1'
            }
        }
        return new Promise(function (resolve, reject) {
            client.query(`DELETE
                          FROM ${tab_name} ${(query != undefined) ? ' WHERE ' + query : ''}`, queryls).then(function (sql) {
                resolve(sql);
            }).catch(function (err) {
                reject(err);
            })
        })
    }, find: function (tab_name, select_name = '*', query = undefined) {
        queryls = []
        if (query.indexOf('and') !== -1) {
            let andls = ''
            for (i in query.split('and')) {
                if (query.split('and')[i].trim().indexOf('or') !== -1) {
                    andls += ParseOr(query.split('and')[i].trim(), queryls)
                } else {
                    let key = query.split('and')[i].trim().split('=')[0].trim(),
                        val = query.split('and')[i].trim().split('=')[1].trim()
                    if (/\'.*\'/.test(val)) {
                        val = val.slice(1, val.length - 1)
                    }
                    if (val === "true" || val === "false") {
                        val = (val === "true") ? true : false
                    }
                    if (/\d+/.test(val)) {
                        val = parseInt(val)
                    }
                    queryls.push(val)
                    val = queryls.length
                    if (andls === '') {
                        andls += key + ' = $' + val
                    } else {
                        andls += ' and ' + key + ' = $' + val
                    }
                }
            }
            query = andls
        } else {
            if (query.indexOf('or') !== -1) {
                query = ParseOr(query, queryls)
            } else {
                let val = query.split('=')[1].trim()
                if (/^\'.*\'$/.test(val)) {
                    val = val.slice(1, val.length - 1)
                }
                if (val === "true" || val === "false") {
                    val = (val === "true") ? true : false
                }
                if (/^\d+$/.test(val)) {
                    val = parseInt(val)
                }
                queryls.push(val)
                query = query.split('=')[0].trim() + ' = $1'
            }
        }
        console.log(`SELECT ${select_name}
                          FROM ${tab_name} ${(query != undefined) ? ' WHERE ' + query : ''}`, queryls,query)
        return new Promise(function (resolve, reject) {
            client.query(`SELECT ${select_name}
                          FROM ${tab_name} ${(query != undefined) ? ' WHERE ' + query : ''}`, queryls).then(function (sql) {
                resolve(sql);
            }).catch(function (err) {
                reject(err);
            })
        })
    }, update: function (tab_name, json, query = undefined) {
        ls = []
        if (query.indexOf('and') !== -1) {
            let andls = ''
            for (i in query.split('and')) {
                if (query.split('and')[i].trim().indexOf('or') !== -1) {
                    andls += ParseOr(query.split('and')[i].trim(),queryls)
                } else {
                    let key = query.split('and')[i].trim().split('=')[0].trim(),
                        val = query.split('and')[i].trim().split('=')[1].trim()
                    if (/\'.*\'/.test(val)) {
                        val = val.slice(1, val.length - 1)
                    }
                    if (val === "true" || val === "false") {
                        val = (val === "true") ? true : false
                    }
                    if (/\d+/.test(val)) {
                        val = parseInt(val)
                    }
                    queryls.push(val)
                    val = queryls.length
                    if (andls === '') {
                        andls += key + ' = $' + val
                    } else {
                        andls += ' and ' + key + ' = $' + val
                    }
                }
            }
            query = andls
        } else {
            if (query.indexOf('or') !== -1) {
                query = ParseOr(query,queryls)
            } else {
                let val = query.split('=')[1].trim()
                if (/^\'.*\'$/.test(val)) {
                    val = val.slice(1, val.length - 1)
                }
                if (val === "true" || val === "false") {
                    val = (val === "true") ? true : false
                }
                if (/^\d+$/.test(val)) {
                    val = parseInt(val)
                }
                queryls.push(val)
                query = query.split('=')[0].trim() + ' = $1'
            }
        }
        set = ''
        for (i in json) {
            ls.push(json[i])
            val = '$' + ls.length
            if (set === '') {
                set += i + ' = ' + val
            } else {
                set += ', ' + i + ' = ' + val
            }
        }
        return new Promise(function (resolve, reject) {
            client.query(`UPDATE ${tab_name}
                          SET ${set}${(query != undefined) ? ' WHERE ' + query : ''}`, ls).then(function (sql) {
                resolve(sql);
            }).catch(function (err) {
                reject(err);
            })
        })
    }, count: function (tab_name, select_name = '*', query = undefined) {
        queryls = []
        if (query.indexOf('and') !== -1) {
            let andls = ''
            for (i in query.split('and')) {
                if (query.split('and')[i].trim().indexOf('or') !== -1) {
                    andls += ParseOr(query.split('and')[i].trim(), queryls)
                } else {
                    let key = query.split('and')[i].trim().split('=')[0].trim(),
                        val = query.split('and')[i].trim().split('=')[1].trim()
                    if (/\'.*\'/.test(val)) {
                        val = val.slice(1, val.length - 1)
                    }
                    if (val === "true" || val === "false") {
                        val = (val === "true") ? true : false
                    }
                    if (/\d+/.test(val)) {
                        val = parseInt(val)
                    }
                    queryls.push(val)
                    val = queryls.length
                    if (andls === '') {
                        andls += key + ' = $' + val
                    } else {
                        andls += ' and ' + key + ' = $' + val
                    }
                }
            }
            query = andls
        } else {
            if (query.indexOf('or') !== -1) {
                query = ParseOr(query, queryls)
            } else {
                let val = query.split('=')[1].trim()
                if (/^\'.*\'$/.test(val)) {
                    val = val.slice(1, val.length - 1)
                }
                if (val === "true" || val === "false") {
                    val = (val === "true") ? true : false
                }
                if (/^\d+$/.test(val)) {
                    val = parseInt(val)
                }
                queryls.push(val)
                query = query.split('=')[0].trim() + ' = $1'
            }
        }
        return new Promise(function (resolve, reject) {
            client.query(`SELECT COUNT(${select_name})
                          FROM ${tab_name} ${(query != undefined) ? ' WHERE ' + query : ''}`, queryls).then(function (sql) {
                resolve(sql);
            }).catch(function (err) {
                reject(err);
            })
        })
    }
}
