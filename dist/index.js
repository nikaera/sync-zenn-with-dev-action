import './sourcemap-register.cjs';/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __createBinding = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (undefined && undefined.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const wait_1 = require("./wait");
const path_1 = __importDefault(require("path"));
const dev_client_1 = require("./dev_client");
const zenn_article_service_1 = require("./zenn_article_service");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const maxRetryCount = 10;
        const devClient = new dev_client_1.DEVClient(core.getInput('api_key', { required: true }));
        const zennArticleService = new zenn_article_service_1.ZennArticleService();
        const articleDir = core.getInput('articles', { required: false });
        const titleFormat = core.getInput('title_format', { required: false });
        const modifiedFilePath = core.getInput('added_modified_filepath', {
            required: false
        });
        const updateAll = core.getInput('update_all', {
            required: false
        });
        const isUpdateAll = updateAll.toLowerCase() === 'true';
        core.info(`update_all: ${updateAll}`);
        try {
            const markdownFilePaths = yield zennArticleService.getMarkdownFileList(articleDir, modifiedFilePath, isUpdateAll);
            core.info(`[markdown files]\n${markdownFilePaths.join('\n')}\n`);
            const devtoArticles = [];
            const newlySyncedArticles = [];
            for (const filePath of markdownFilePaths) {
                const article = yield zennArticleService.parse(filePath);
                const request = zennArticleService.createArticleRequest(article, {
                    titleFormat
                });
                const username = core.getInput('username', { required: false });
                if (username) {
                    const basename = path_1.default.basename(filePath, '.md');
                    request.article.canonical_url = `https://zenn.dev/${username}/articles/${basename}`;
                }
                let retryCount = 0;
                const devArticleId = article.header.dev_article_id;
                if (devArticleId !== undefined) {
                    while (retryCount < maxRetryCount) {
                        try {
                            const response = yield devClient.updateArticle(devArticleId, request);
                            if (response !== null) {
                                devtoArticles.push(response);
                            }
                            break;
                        }
                        catch (err) {
                            if (err instanceof Error) {
                                core.error(err.message);
                            }
                        }
                        finally {
                            // There is a limit of 30 requests per 30 seconds.
                            // https://docs.forem.com/api/#operation/updateArticle
                            yield (0, wait_1.wait)(1 * 1000);
                            retryCount++;
                        }
                    }
                }
                else {
                    while (retryCount < maxRetryCount) {
                        try {
                            const response = yield devClient.createArticle(request);
                            if (response !== null) {
                                yield zennArticleService.writeDEVArticleIDToFile(filePath, article, response.id);
                            }
                            if (response !== null) {
                                devtoArticles.push(response);
                                newlySyncedArticles.push(filePath);
                            }
                            break;
                        }
                        catch (err) {
                            if (err instanceof Error) {
                                core.error(err.message);
                            }
                        }
                        finally {
                            // There is a limit of 10 requests per 30 seconds.
                            // https://docs.forem.com/api/#operation/createArticle
                            yield (0, wait_1.wait)(3 * 1000);
                            retryCount++;
                        }
                    }
                }
            }
            core.setOutput('articles', JSON.stringify(devtoArticles, undefined, 2));
            if (newlySyncedArticles.length > 0) {
                core.setOutput('newly-sync-articles', newlySyncedArticles.join(' '));
            }
        }
        catch (err) {
            core.error(JSON.stringify(err));
            if (err instanceof Error) {
                core.setFailed(err.message);
            }
        }
    });
}
void run();


//# sourceMappingURL=index.js.map