"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sass_1 = require("./sass");
const dopees_chain_1 = require("dopees-chain");
const fspath = require("path");
const root = fspath.normalize(fspath.join(process.cwd(), '../test'));
const runner = dopees_chain_1.Runner.from([
    sass_1.sass()
]);
runner.execute('main.css', root);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwdWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZGVwdWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBOEI7QUFDOUIsK0NBQXNDO0FBQ3RDLCtCQUErQjtBQUUvQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFFckUsTUFBTSxNQUFNLEdBQUcscUJBQU0sQ0FBQyxJQUFJLENBQUM7SUFDekIsV0FBSSxFQUFFO0NBQ1AsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMifQ==