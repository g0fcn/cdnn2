//构架路由
//但被请求时返回leancloud的gh类的对应的数据
//路由的路径是/gh/:owner/:repo@:branch/:path
//引入依赖
const fetch = require('node-fetch')
const fs = require("fs");
const db = require("./db");
const ss = require("simplest-server")
const mime = require("mime");
//函数区
//获取github的数据
//保证以下函数可以被外部调用，并返回请求结果，所以需要promise
//获取github的数据并保存
function getGithubData(owner, repo, branch, path) {
    //获取github的数据
    return new Promise(function (resolve, reject) {
        //获取github的数据
        //在promise中使用https请求
        fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
            headers: {
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
                'Accept-Encoding': 'utf-8',  //这里设置返回的编码方式 设置其他的会是乱码
                'Accept-Language': 'zh-CN,zh;q=0.8',
                'Connection': 'keep-alive',
                'Authorization': 'token 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'
            }
        }).then(function (data) {
            data.json().then(function (json) {
                path = `${owner}/${repo}@${branch}/${path}`
                if (json.content) {
                    db.find('github', '*', `path='${path}'`).then(function (sql) {
                        if (sql.rows.length > 0) {
                            db.update('github', {
                                path: path, data: json.content, time: new Date().getTime(), type: 'file'
                            }, `path='${path}'`).then(function (sql) {
                                resolve(new Buffer.from(json.content, 'base64'));
                            }).catch(function (err) {
                                reject(err)
                            })
                        } else {
                            db.add('github', {
                                path: path, data: json.content, time: new Date().getTime(), type: 'file'
                            }).then(function (sql) {
                                resolve(new Buffer.from(json.content, 'base64'));
                            }).catch(function (err) {
                                reject(err)
                            })
                        }
                    }).catch(function (err) {
                        reject(err)
                    })
                } else if (json.push) {
                    db.find('github', '*', `path='${path}'`).then(function (sql) {
                        if (sql.rows.length > 0) {
                            db.update('github', {
                                path: path, data: JSON.stringify(json), time: new Date().getTime(), type: 'dir'
                            }, `path='${path}'`).then(function (sql) {
                                resolve(json);
                            }).catch(function (err) {
                                reject(err)
                            })
                        } else {
                            db.add('github', {
                                path: path, data: JSON.stringify(json), time: new Date().getTime(), type: 'dir'
                            }).then(function (sql) {
                                resolve(json);
                            }).catch(function (err) {
                                reject(err)
                            })
                        }
                    }).catch(function (err) {
                        reject(err)
                    })
                } else {
                    reject('没有该文件，请检查路径！');
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    })
}

//获取数据库上的文件如果没有则使用getGithubData(owner, repo, branch, path)
function getDB(owner, repo, branch, path) {
    return new Promise(function (resolve, reject) {
        db.find('github', '*', `path='${owner}/${repo}@${branch}/${path}'`).then(function (sql) {
            if (sql.rows.length > 0) {
                //时间戳和现在时间戳比较大6小时，则重新获取getGithubData(owner, repo, branch, path)
                var time = sql.rows[0].time;
                var now = new Date().getTime();
                if (now - time > 6 * 60 * 60 * 1000) {
                    getGithubData(owner, repo, branch, path).then(function (data) {
                        resolve(data);
                    }).catch(function (e) {
                        resolve((sql.rows[0].type === 'dir') ? JSON.parse(sql.rows[0].data) : new Buffer.from(sql.rows[0].data, 'base64'));
                    });
                } else {
                    resolve((sql.rows[0].type === 'dir') ? JSON.parse(sql.rows[0].data) : new Buffer.from(sql.rows[0].data, 'base64'));
                }
            } else {
                //如果没有数据，则创建
                //获取github的数据
                getGithubData(owner, repo, branch, path).then(function (data) {
                    resolve(data);
                }).catch(function (e) {
                    reject(e);
                });
            }
        }).catch(function (e) {
            reject(e);
        });
    });
}

function getGiteeData(owner, repo, branch, path) {
    //获取github的数据
    return new Promise(function (resolve, reject) {
        //获取github的数据
        //在promise中使用https请求
        fetch(`https://gitee.com/${owner}/${repo}/raw/${branch}/${path}`, {
            headers: {
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
                'Accept-Encoding': 'utf-8',  //这里设置返回的编码方式 设置其他的会是乱码
                'Accept-Language': 'zh-CN,zh;q=0.8',
                'Connection': 'keep-alive'
            }
        }).then(function (data) {
            path = `${owner}/${repo}@${branch}/${path}`
            if (data.status === 200) {
                data.arrayBuffer().then(function (data) {
                    path = `${owner}/${repo}@${branch}/${path}`
                    db.find('gitee', '*', `path='${path}'`).then(function (sql) {
                        if (sql.rows.length > 0) {
                            db.update('gitee', {
                                path: path,
                                data: new Buffer.from(data, 'binary').toString('base64'),
                                time: new Date().getTime(),
                                type: 'file'
                            }, `path='${path}'`).then(function (sql) {
                                resolve(new Buffer.from(data, 'binary'));
                            }).catch(function (err) {
                                reject(err)
                            })
                        } else {
                            db.add('gitee', {
                                path: path,
                                data: new Buffer.from(data, 'binary').toString('base64'),
                                time: new Date().getTime(),
                                type: 'file'
                            }).then(function (sql) {
                                resolve(new Buffer.from(data, 'binary'));
                            }).catch(function (err) {
                                reject(err)
                            })
                        }
                    }).catch(function (err) {
                        reject(err)
                    })
                });
            } else {
                reject('没有该文件，请检查路径！');
            }
        })
    })
}

//获取数据库上的文件如果没有则使用getGithubData(owner, repo, branch, path)
function getGiteeDB(owner, repo, branch, path) {
    return new Promise(function (resolve, reject) {
        db.find('gitee', '*', `path='${owner}/${repo}@${branch}/${path}'`).then(function (sql) {
            if (sql.rows.length > 0) {
                //时间戳和现在时间戳比较大6小时，则重新获取getGithubData(owner, repo, branch, path)
                var time = sql.rows[0].time;
                var now = new Date().getTime();
                if (now - time > 6 * 60 * 60 * 1000) {
                    getGiteeData(owner, repo, branch, path).then(function (data) {
                        resolve(data);
                    }).catch(function (e) {
                        resolve((sql.rows[0].type === 'dir') ? JSON.parse(sql.rows[0].data) : new Buffer.from(sql.rows[0].data, 'base64'));
                    });
                } else {
                    resolve((sql.rows[0].type === 'dir') ? JSON.parse(sql.rows[0].data) : new Buffer.from(sql.rows[0].data, 'base64'));
                }
            } else {
                //如果没有数据，则创建
                //获取github的数据
                getGiteeData(owner, repo, branch, path).then(function (data) {
                    resolve(data);
                }).catch(function (e) {
                    reject(e);
                });
            }
        }).catch(function (e) {
            reject(e);
        });
    });
}

function getNpmData(packager, v, file) {
    //获取NPM的数据
    return new Promise(function (resolve, reject) {
        fetch(`https://www.npmjs.com/package/${packager}/v/${v}/index`).then(function (data) {
            if (data.status === 200) {
                data.json().then(function (json) {
                    if (json.files[file]) {
                        console.log(json.files[file].hex)
                        fetch(`https://www.npmjs.com/package/${packager}/file/${json.files[file].hex}`).then(function (data) {
                            data.arrayBuffer().then(function (data) {
                                db.find('npm', '*', `path='${packager}@${v}${file}'`).then(function (sql) {
                                    if (sql.rows.length > 0) {
                                        db.update('npm', {
                                            type: json.files[file].contentType,
                                            data: new Buffer.from(data, 'binary').toString('base64'),
                                            time: new Date().getTime(),
                                            path: packager + file
                                        }, `path='${packager}@${v}${file}'`).then(function (sql) {
                                            resolve({
                                                type: json.files[file].contentType,
                                                data: new Buffer.from(data, 'binary').toString('base64'),
                                                time: new Date().getTime(),
                                                path: packager + file
                                            });
                                        }).catch(function (err) {
                                            reject(err)
                                        })
                                    } else {
                                        db.add('npm', {
                                            type: json.files[file].contentType,
                                            data: new Buffer.from(data, 'binary').toString('base64'),
                                            time: new Date().getTime(),
                                            path: packager + '@' + v + file
                                        }).then(function (sql) {
                                            resolve({
                                                type: json.files[file].contentType,
                                                data: new Buffer.from(data, 'binary').toString('base64'),
                                                time: new Date().getTime(),
                                                path: packager + '@' + v + file
                                            });
                                        }).catch(function (err) {
                                            reject(err)
                                        })
                                    }
                                }).catch(function (err) {
                                    reject(err)
                                })
                            })
                        })
                    } else {
                        reject('没有该文件，请检查路径！')
                    }
                })
            } else {
                console.log(data)
            }
        });
    });
}

function getNpmDB(packager, v, file) {
    //获取NPM的数据
    return new Promise(function (resolve, reject) {
        db.find('npm', '*', `path='${packager}@${v}${file}'`).then(function (sql) {
            if (sql.rows.length > 0) {
                resolve(sql.rows[0]);
            } else {
                //如果没有数据，则创建
                //获取github的数据
                getNpmData(packager, v, file).then(function (data) {
                    resolve(data);
                }).catch(function (e) {
                    reject(e);
                });
            }
        }).catch(function (e) {
            reject(e);
        });
    });
}

function listv(pkg) {
    return new Promise(function (resolve, reject) {
        fetch('https://registry.npmmirror.com/' + pkg).then(function (response) {
            if (response.status === 200) {
                response.json().then(function (json) {
                    resolve(json['dist-tags'].latest)
                })
            }
        })
    })
}

function getGithubinfo(owner, repo) {
    //获取github的数据
    return new Promise(function (resolve, reject) {
        //获取github的数据
        //在promise中使用https请求
        fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
                'Accept-Encoding': 'utf-8',  //这里设置返回的编码方式 设置其他的会是乱码
                'Accept-Language': 'zh-CN,zh;q=0.8',
                'Connection': 'keep-alive',
                'Authorization': 'token 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'
            }
        }).then(function (data) {
            data.json().then(function (json) {
                path = `${owner}/${repo}`
                if (json.default_branch) {
                    db.find('github', '*', `path='${path}'`).then(function (sql) {
                        if (sql.rows.length > 0) {
                            db.update('defaultbranch', {
                                path: path, time: new Date().getTime(), data: json.default_branch
                            }, `path=${path}`).then(function (sql) {
                                resolve(json.default_branch)
                            }).catch(function (e) {
                                reject(e)
                            })
                        } else {
                            db.add('defaultbranch', {
                                path: path, time: new Date().getTime(), data: json.default_branch
                            }).then(function (sql) {
                                resolve(json.default_branch)
                            }).catch(function (e) {
                                reject(e)
                            })
                        }
                    }).catch(function (err) {
                        reject(err)
                    })
                } else {
                    reject('仓库可能不存在或没有分支，请检查！')
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    })
}

function getDBinfo(owner, repo) {
    return new Promise(function (resolve, reject) {
        db.find('defaultbranch', '*', `path='${owner}/${repo}'`).then(function (sql) {
            if (sql.rows.length > 0) {
                //时间戳和现在时间戳比较大6小时，则重新获取getGithubData(owner, repo, branch, path)
                var time = sql.rows[0].time;
                var now = new Date().getTime();
                if (now - time > 6 * 60 * 60 * 1000) {
                    getGithubinfo(owner, repo).then(function (data) {
                        resolve(data);
                    }).catch(function (e) {
                        resolve(sql.rows[0].data);
                    });
                } else {
                    resolve(sql.rows[0].data);
                }
            } else {
                //如果没有数据，则创建
                //获取github的数据
                getGithubinfo(owner, repo).then(function (data) {
                    resolve(data);
                }).catch(function (e) {
                    reject(e);
                });
            }
        }).catch(function (e) {
            reject(e);
        });
    });
}

ss.http({
    'AllRun': function (req, res) {
        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'max-age=3600')
        res.setHeader('Cache-Control', 'max-age=1800')
        res.setHeader('CDN', 'CDNN');
    }, ':\/gh\/.+\/.+': function (req, res) {
        if (/\/gh\/.+\/.+@.+/.test(req.url.pathname)) {
            try {
                let cansu = req.url.pathname.match(/\/gh\/(.*)/)[1].split('/')
                getDB(cansu[0], cansu[1].split('@')[0], cansu[1].split('@')[1], cansu.slice(2).join('/')).then(function (data) {
                    if (data.push) {
                        let ls = [{
                            name: '...',
                            type: 'dir',
                            url: req.url.pathname.split('/').slice(0, (req.url.pathname.split('/')[req.url.pathname.split('/').length - 1] === '') ? req.url.pathname.split('/').length - 2 : req.url.pathname.split('/').length - 1).join('/')
                        }]
                        for (i in data) {
                            ls.push({
                                name: data[i].name,
                                type: data[i].type,
                                url: ((data[i].type === 'file') ? req.url.pathname + '/' + data[i].name : req.url.pathname + '/' + data[i].name + '/').replace(/\/\//g, '/')
                            })
                        }
                        ss.ejs(req, res, 200, __dirname + '/t/list.ejs', {ls: ls});
                    } else {
                        res.writeHead(200, {"Content-Type": mime.getType(cansu.slice(2).join('/').match(/^(.+\.)*(.*)/)[2]) + ';charset=utf-8'});
                        res.end(data);
                    }
                }).catch(function (e) {
                    res.setHeader('Err-Type', 'SQL')
                    res.err[500](req, res, e)
                })
            } catch (e) {
                res.setHeader('Err-Type', 'CODE')
                res.err[500](req, res, e)
            }
        } else {
            try {
                let cansu = req.url.pathname.match(/\/gh\/(.*)/)[1].split('/')
                getDBinfo(cansu[0], cansu[1]).then(function (branch) {
                    console.log(cansu.slice(2).join('/').match(/^(.+\.)*(.*)/)[2])
                    getDB(cansu[0], cansu[1], branch, cansu.slice(2).join('/')).then(function (data) {
                        if (data.push) {
                            let ls = [{
                                name: '...',
                                type: 'dir',
                                url: req.url.pathname.split('/').slice(0, (req.url.pathname.split('/')[req.url.pathname.split('/').length - 1] === '') ? req.url.pathname.split('/').length - 2 : req.url.pathname.split('/').length - 1).join('/')
                            }]
                            for (i in data) {
                                ls.push({
                                    name: data[i].name,
                                    type: data[i].type,
                                    url: ((data[i].type === 'file') ? req.url.pathname + '/' + data[i].name : req.url.pathname + '/' + data[i].name + '/').replace(/\/\//g, '/')
                                })
                            }
                            ss.ejs(req, res, 200, __dirname + '/t/list.ejs', {ls: ls});
                        } else {
                            res.writeHead(200, {"Content-Type": mime.getType(cansu.slice(2).join('/').match(/^(.+\.)*(.*)/)[2]) + ';charset=utf-8'});
                            res.end(data);
                        }
                    }).catch(function (e) {
                        res.setHeader('Err-Type', 'SQL')
                        res.err[500](req, res, e)
                    })
                }).catch(function (e) {
                    res.setHeader('Err-Type', 'INFO DB')
                    res.err[500](req, res, e)
                })
            } catch (e) {
                res.setHeader('Err-Type', 'CODE')
                res.err[500](req, res, e)
            }
        }
    }, ':\/api\/.+\/.+@.+\/.+': function (req, res) {
        try {
            let cansu = req.url.pathname.match(/\/api\/(.*)/)[1].split('/')
            getGithubData(cansu[0], cansu[1].split('@')[0], cansu[1].split('@')[1], cansu.slice(2).join('/')).then(function (data) {
                res.writeHead(200, {"Content-Type": 'text/html;charset=utf-8'});
                res.end(fs.readFileSync(__dirname + '/t/su.html', 'utf8'));
            }).catch(function (e) {
                res.setHeader('Err-Type', 'SQL')
                res.err[500](req, res, e)
            })
        } catch (e) {
            res.setHeader('Err-Type', 'CODE')
            res.err[500](req, res, e)
        }
    }, ':\/npm\/.*': function (req, res) {
        try {
            url = req.url.pathname.split('/')
            if (url[2][0] === '@') {
                if (url[3] && url[3] !== '') {
                    console.log(url[2].toString() + '/' + ((url[3].indexOf('@') !== -1) ? url[3].split('@')[0] : url[3]).toString(), ((url[3].indexOf('@') !== -1) ? url[3].split('@')[1] : 'last').toString(), '/' + url.slice(4).join('/'))
                    getNpmDB(url[2].toString() + '/' + ((url[3].indexOf('@') !== -1) ? url[3].split('@')[0] : url[3]).toString(), ((url[3].indexOf('@') !== -1) ? url[3].split('@')[1] : 'latest').toString(), '/' + url.slice(4).join('/')).then(function (data) {
                        res.writeHead(200, {'content-type': data.type + ';charset=utf-8'})
                        res.end(new Buffer.from(data.data, 'base64'));
                    }).catch(function (err) {
                        res.setHeader('Err-Type', 'SQL')
                        res.err[500](req, res, err)
                    })
                } else {
                    res.setHeader('Err-Type', 'USER INFO')
                    res.err[500](req, res, '这是一个组织，不是一个包！')
                }
            } else {
                console.log((url[2].toString().indexOf('@') !== -1) ? url[2].toString().split('@')[0].toString() : url[2].toString(), (url[2].toString().indexOf('@') !== -1) ? url[2].toString().split('@')[1] : 'last', '/' + url.slice(4).join('/'))
                getNpmDB((url[2].toString().indexOf('@') !== -1) ? url[2].toString().split('@')[0].toString() : url[2].toString(), (url[2].toString().indexOf('@') !== -1) ? url[2].toString().split('@')[1] : 'last', '/' + url.slice(4).join('/')).then(function (data) {
                    res.writeHead(200, {'content-type': data.type + ';charset=utf-8'})
                    res.end(new Buffer.from(data.data, 'base64'));
                }).catch(function (err) {
                    res.setHeader('Err-Type', 'SQL')
                    res.err[500](req, res, err)
                })
            }
        } catch (e) {
            res.setHeader('Err-Type', 'CODE')
            res.err[500](req, res, e)
        }
    }, ':/cdnjs.*': function (req, res) {
        try {
            getDB('cdnjs', 'cdnjs', 'master', 'ajax/libs' + req.url.pathname.split('/cdnjs')[1]).then(function (data) {
                if (data.push) {
                    let ls = [{
                        name: '...',
                        type: 'dir',
                        url: req.url.pathname.split('/').slice(0, (req.url.pathname.split('/')[req.url.pathname.split('/').length - 1] === '') ? req.url.pathname.split('/').length - 2 : req.url.pathname.split('/').length - 1).join('/')
                    }]
                    for (i in data) {
                        ls.push({
                            name: data[i].name,
                            type: data[i].type,
                            url: ((data[i].type === 'file') ? req.url.pathname + '/' + data[i].name : req.url.pathname + '/' + data[i].name + '/').replace(/\/\//g, '/')
                        })
                    }
                    ss.ejs(req, res, 200, __dirname + '/t/list.ejs', {ls: ls});
                } else {
                    res.writeHead(200, {"Content-Type": ((req.url.pathname.indexOf('.') !== -1) ? mime.getType(req.url.pathname.split('.')[req.url.pathname.split('.').length - 1]) : 'text/plain') + ';charset=utf-8'});
                    res.end(data);
                }
            }).catch(function (e) {
                res.setHeader('Err-Type', 'SQL')
                res.err[500](req, res, e)
            })
        } catch (e) {
            res.setHeader('Err-Type', 'CODE')
            res.err[500](req, res, e)
        }
    }, ':\/ge\/.+\/.+@.+/.+': function (req, res) {
        try {
            let cansu = req.url.pathname.match(/\/ge\/(.*)/)[1].split('/')
            getGiteeDB(cansu[0], cansu[1].split('@')[0], cansu[1].split('@')[1], cansu.slice(2).join('/')).then(function (data) {
                res.writeHead(200, {"Content-Type": ((req.url.pathname.indexOf('.') !== -1) ? mime.getType(req.url.pathname.split('.')[req.url.pathname.split('.').length - 1]) : 'text/plain') + ';charset=utf-8'});
                res.end(data);
            }).catch(function (e) {
                res.setHeader('Err-Type', 'SQL')
                res.err[500](req, res, e)
            })
        } catch (e) {
            res.setHeader('Err-Type', 'CODE')
            res.err[500](req, res, e)
        }
    }, '500': function (req, res, e) {
        try {
            ss.ejs(req, res, 500, __dirname + '/t/err.ejs', {
                err: e
            })
        } catch (e) {
            res.err[500](req, res, e)
        }
    }, '404': function (req, res) {
        try {
            ss.ejs(req, res, 404, __dirname + '/t/err.ejs', {
                err: '页面不存在'
            })
        } catch (e) {
            res.err[500](req, res, e)
        }
    }, '/': function (req, res) {
        try {
            res.writeHead(200, {"Content-Type": 'text/html;charset=utf-8'});
            res.end(fs.readFileSync(__dirname + '/t/index.html', 'utf8'));
        } catch (e) {
            res.err[500](req, res, e)
        }
    }, '/logo': function (req, res) {
        try {
            res.writeHead(200, {"Content-Type": 'image/webp;charset=utf-8'});
            res.end(fs.readFileSync(__dirname + '/t/logo.webp'));
        } catch (e) {
            res.err[500](req, res, e)
        }
    }
}).listen(4000);
