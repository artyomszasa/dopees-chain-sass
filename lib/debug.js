"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sass_1 = require("./sass");
const dopees_chain_1 = require("dopees-chain");
const fspath = require("path");
const storage_1 = require("dopees-chain/lib/storage");
const root = fspath.normalize(fspath.join(process.cwd(), './test'));
const runner = dopees_chain_1.Runner.from([
    sass_1.sass({ persists: true, targetRoot: root })
], new storage_1.MemoryStorage());
runner.execute('./main.css', root).then(() => runner.execute('./main.css', root));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZGVidWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBOEI7QUFDOUIsK0NBQXNDO0FBQ3RDLCtCQUErQjtBQUMvQixzREFBeUQ7QUFFekQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBRXBFLE1BQU0sTUFBTSxHQUFHLHFCQUFNLENBQUMsSUFBSSxDQUFDO0lBQ3pCLFdBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDO0NBQzNDLEVBQUUsSUFBSSx1QkFBYSxFQUFFLENBQUMsQ0FBQztBQUV4QixNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQSJ9