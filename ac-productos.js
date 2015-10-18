(function () {
    'use strict';

    var scripts = document.getElementsByTagName("script");
    var currentScriptPath = scripts[scripts.length - 1].src;

    angular.module('acProductos', [])
        .factory('ProductService', ProductService)
        .service('ProductVars', ProductVars)
        .factory('CategoryService', CategoryService)
        .service('CategoryVars', CategoryVars)
        .factory('CartService', CartService)
        .service('CartVars', CartVars)
    ;


    ProductService.$inject = ['$http', 'ProductVars', '$cacheFactory', 'AcUtils'];
    function ProductService($http, ProductVars, $cacheFactory, AcUtils) {
        //Variables
        var service = {};

        var url = currentScriptPath.replace('ac-productos.js', '/includes/ac-productos.php');

        //Function declarations
        service.get = get;
        service.getByParams = getByParams;
        service.getMasVendidos = getMasVendidos;

        service.create = create;

        service.update = update;

        service.remove = remove;


        service.goToPagina = goToPagina;
        service.next = next;
        service.prev = prev;

        return service;

        //Functions
        /**
         * @description Obtiene todos los productos
         * @param callback
         * @returns {*}
         */
        function get(callback) {
            var urlGet = url + '?function=getProductos';
            var $httpDefaultCache = $cacheFactory.get('$http');
            var cachedData = [];


            // Verifica si existe el cache de productos
            if ($httpDefaultCache.get(urlGet) != undefined) {
                if (ProductVars.clearCache) {
                    $httpDefaultCache.remove(urlGet);
                }
                else {
                    cachedData = $httpDefaultCache.get(urlGet);
                    callback(cachedData);
                    return;
                }
            }


            return $http.get(urlGet, {cache: true})
                .success(function (data) {
                    $httpDefaultCache.put(urlGet, data);
                    ProductVars.clearCache = false;
                    ProductVars.paginas = (data.length % ProductVars.paginacion == 0) ? parseInt(data.length / ProductVars.paginacion) : parseInt(data.length / ProductVars.paginacion) + 1;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                    ProductVars.clearCache = false;
                })
        }


        /**
         * @description Retorna la lista filtrada de productos
         * @param param -> String, separado por comas (,) que contiene la lista de parámetros de búsqueda, por ej: nombre, sku
         * @param value
         * @param callback
         */
        function getByParams(params, values, exact_match, callback) {
            get(function (data) {
                AcUtils.getByParams(params, values, exact_match, data, callback);
            })
        }

        /**
         * @description Retorna los primero 8 productos mas vendidos
         * @param callback
         */
        function getMasVendidos(callback) {
            get(function (data) {
                var response = data.sort(function (a, b) {
                    return b.vendidos - a.vendidos;
                });

                callback(response.slice(0, 8));
            });
        }

        /** @name: remove
         * @param producto_id
         * @param callback
         * @description: Elimina el producto seleccionado.
         */
        function remove(producto_id, callback) {
            return $http.post(url,
                {function: 'removeProducto', 'producto_id': producto_id})
                .success(function (data) {
                    //console.log(data);
                    if (data !== 'false') {
                        ProductVars.clearCache = true;
                        callback(data);
                    }
                })
                .error(function (data) {
                    callback(data);
                })
        }

        /**
         * @description: Crea un producto.
         * @param producto
         * @param callback
         * @returns {*}
         */
        function create(producto, callback) {

            return $http.post(url,
                {
                    'function': 'createProducto',
                    'producto': JSON.stringify(producto)
                })
                .success(function (data) {
                    ProductVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    ProductVars.clearCache = true;
                    callback(data);
                });
        }


        /** @name: update
         * @param producto
         * @param callback
         * @description: Realiza update al producto.
         */
        function update(producto, callback) {
            return $http.post(url,
                {
                    'function': 'updateProducto',
                    'producto': JSON.stringify(producto)
                })
                .success(function (data) {
                    ProductVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * Para el uso de la páginación, definir en el controlador las siguientes variables:
         *
         vm.start = 0;
         vm.pagina = ProductVars.pagina;
         ProductVars.paginacion = 5; Cantidad de registros por página
         vm.end = ProductVars.paginacion;


         En el HTML, en el ng-repeat agregar el siguiente filtro: limitTo:appCtrl.end:appCtrl.start;

         Agregar un botón de next:
         <button ng-click="appCtrl.next()">next</button>

         Agregar un botón de prev:
         <button ng-click="appCtrl.prev()">prev</button>

         Agregar un input para la página:
         <input type="text" ng-keyup="appCtrl.goToPagina()" ng-model="appCtrl.pagina">

         */


        /**
         * @description: Ir a página
         * @param pagina
         * @returns {*}
         * uso: agregar un método
         vm.goToPagina = function () {
                vm.start= ProductService.goToPagina(vm.pagina).start;
            };
         */
        function goToPagina(pagina) {

            if (isNaN(pagina) || pagina < 1) {
                ProductVars.pagina = 1;
                return ProductVars;
            }

            if (pagina > ProductVars.paginas) {
                ProductVars.pagina = ProductVars.paginas;
                return ProductVars;
            }

            ProductVars.pagina = pagina - 1;
            ProductVars.start = ProductVars.pagina * ProductVars.paginacion;
            return ProductVars;

        }

        /**
         * @name next
         * @description Ir a próxima página
         * @returns {*}
         * uso agregar un metodo
         vm.next = function () {
                vm.start = ProductService.next().start;
                vm.pagina = ProductVars.pagina;
            };
         */
        function next() {

            if (ProductVars.pagina + 1 > ProductVars.paginas) {
                return ProductVars;
            }
            ProductVars.start = (ProductVars.pagina * ProductVars.paginacion);
            ProductVars.pagina = ProductVars.pagina + 1;
            //ProductVars.end = ProductVars.start + ProductVars.paginacion;
            return ProductVars;
        }

        /**
         * @name previous
         * @description Ir a página anterior
         * @returns {*}
         * uso, agregar un método
         vm.prev = function () {
                vm.start= ProductService.prev().start;
                vm.pagina = ProductVars.pagina;
            };
         */
        function prev() {


            if (ProductVars.pagina - 2 < 0) {
                return ProductVars;
            }

            //ProductVars.end = ProductVars.start;
            ProductVars.start = (ProductVars.pagina - 2 ) * ProductVars.paginacion;
            ProductVars.pagina = ProductVars.pagina - 1;
            return ProductVars;
        }


    }

    ProductVars.$inject = [];
    /**
     * @description Almacena variables temporales de productos
     * @constructor
     */
    function ProductVars() {
        // Cantidad de páginas total del recordset
        this.paginas = 1;
        // Página seleccionada
        this.pagina = 1;
        // Cantidad de registros por página
        this.paginacion = 10;
        // Registro inicial, no es página, es el registro
        this.start = 0;


        // Indica si se debe limpiar el caché la próxima vez que se solicite un get
        this.clearCache = true;

    }


    CategoryService.$inject = ['$http', 'CategoryVars', '$cacheFactory', 'AcUtils'];
    function CategoryService($http, CategoryVars, $cacheFactory, AcUtils) {
        //Variables
        var service = {};

        var url = currentScriptPath.replace('ac-productos.js', '/includes/ac-productos.php');

        //Function declarations
        service.get = get;
        service.getByParams = getByParams;

        service.create = create;

        service.update = update;

        service.remove = remove;


        service.goToPagina = goToPagina;
        service.next = next;
        service.prev = prev;

        return service;

        //Functions
        /**
         * @description Obtiene todos los categorias
         * @param callback
         * @returns {*}
         */
        function get(callback) {
            var urlGet = url + '?function=getCategorias';
            var $httpDefaultCache = $cacheFactory.get('$http');
            var cachedData = [];


            // Verifica si existe el cache de categorias
            if ($httpDefaultCache.get(urlGet) != undefined) {
                if (CategoryVars.clearCache) {
                    $httpDefaultCache.remove(urlGet);
                }
                else {
                    cachedData = $httpDefaultCache.get(urlGet);
                    callback(cachedData);
                    return;
                }
            }


            return $http.get(urlGet, {cache: true})
                .success(function (data) {
                    $httpDefaultCache.put(urlGet, data);
                    CategoryVars.clearCache = false;
                    CategoryVars.paginas = (data.length % CategoryVars.paginacion == 0) ? parseInt(data.length / CategoryVars.paginacion) : parseInt(data.length / CategoryVars.paginacion) + 1;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                    CategoryVars.clearCache = false;
                })
        }


        /**
         * @description Retorna la lista filtrada de categoryos
         * @param param -> String, separado por comas (,) que contiene la lista de parámetros de búsqueda, por ej: nombre, sku
         * @param value
         * @param callback
         */
        function getByParams(params, values, exact_match, callback) {
            get(function (data) {

                AcUtils.getByParams(params, values, exact_match, data, callback);
            })
        }

        /** @name: remove
         * @param categoryo_id
         * @param callback
         * @description: Elimina el categoryo seleccionado.
         */
        function remove(categoryo_id, callback) {
            return $http.post(url,
                {function: 'removeCategoria', 'categoryo_id': categoryo_id})
                .success(function (data) {
                    //console.log(data);
                    if (data !== 'false') {
                        CategoryVars.clearCache = true;
                        callback(data);
                    }
                })
                .error(function (data) {
                    callback(data);
                })
        }

        /**
         * @description: Crea un categoryo.
         * @param categoryo
         * @param callback
         * @returns {*}
         */
        function create(categoryo, callback) {

            return $http.post(url,
                {
                    'function': 'createCategoria',
                    'categoryo': JSON.stringify(categoryo)
                })
                .success(function (data) {
                    CategoryVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    CategoryVars.clearCache = true;
                    callback(data);
                });
        }


        /** @name: update
         * @param categoryo
         * @param callback
         * @description: Realiza update al categoryo.
         */
        function update(categoryo, callback) {
            return $http.post(url,
                {
                    'function': 'updateCategoria',
                    'categoryo': JSON.stringify(categoryo)
                })
                .success(function (data) {
                    CategoryVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * Para el uso de la páginación, definir en el controlador las siguientes variables:
         *
         vm.start = 0;
         vm.pagina = CategoryVars.pagina;
         CategoryVars.paginacion = 5; Cantidad de registros por página
         vm.end = CategoryVars.paginacion;


         En el HTML, en el ng-repeat agregar el siguiente filtro: limitTo:appCtrl.end:appCtrl.start;

         Agregar un botón de next:
         <button ng-click="appCtrl.next()">next</button>

         Agregar un botón de prev:
         <button ng-click="appCtrl.prev()">prev</button>

         Agregar un input para la página:
         <input type="text" ng-keyup="appCtrl.goToPagina()" ng-model="appCtrl.pagina">

         */


        /**
         * @description: Ir a página
         * @param pagina
         * @returns {*}
         * uso: agregar un método
         vm.goToPagina = function () {
                vm.start= CategoryService.goToPagina(vm.pagina).start;
            };
         */
        function goToPagina(pagina) {

            if (isNaN(pagina) || pagina < 1) {
                CategoryVars.pagina = 1;
                return CategoryVars;
            }

            if (pagina > CategoryVars.paginas) {
                CategoryVars.pagina = CategoryVars.paginas;
                return CategoryVars;
            }

            CategoryVars.pagina = pagina - 1;
            CategoryVars.start = CategoryVars.pagina * CategoryVars.paginacion;
            return CategoryVars;

        }

        /**
         * @name next
         * @description Ir a próxima página
         * @returns {*}
         * uso agregar un metodo
         vm.next = function () {
                vm.start = CategoryService.next().start;
                vm.pagina = CategoryVars.pagina;
            };
         */
        function next() {

            if (CategoryVars.pagina + 1 > CategoryVars.paginas) {
                return CategoryVars;
            }
            CategoryVars.start = (CategoryVars.pagina * CategoryVars.paginacion);
            CategoryVars.pagina = CategoryVars.pagina + 1;
            //CategoryVars.end = CategoryVars.start + CategoryVars.paginacion;
            return CategoryVars;
        }

        /**
         * @name previous
         * @description Ir a página anterior
         * @returns {*}
         * uso, agregar un método
         vm.prev = function () {
                vm.start= CategoryService.prev().start;
                vm.pagina = CategoryVars.pagina;
            };
         */
        function prev() {


            if (CategoryVars.pagina - 2 < 0) {
                return CategoryVars;
            }

            //CategoryVars.end = CategoryVars.start;
            CategoryVars.start = (CategoryVars.pagina - 2 ) * CategoryVars.paginacion;
            CategoryVars.pagina = CategoryVars.pagina - 1;
            return CategoryVars;
        }


    }

    CategoryVars.$inject = [];
    /**
     * @description Almacena variables temporales de categoryos
     * @constructor
     */
    function CategoryVars() {
        // Cantidad de páginas total del recordset
        this.paginas = 1;
        // Página seleccionada
        this.pagina = 1;
        // Cantidad de registros por página
        this.paginacion = 10;
        // Registro inicial, no es página, es el registro
        this.start = 0;


        // Indica si se debe limpiar el caché la próxima vez que se solicite un get
        this.clearCache = true;

    }


    CartService.$inject = ['$http', 'CartVars', '$cacheFactory', 'AcUtils'];
    function CartService($http, CartVars, $cacheFactory, AcUtils) {
        //Variables
        var service = {};

        var url = currentScriptPath.replace('ac-productos.js', '/includes/ac-productos.php');

        //Function declarations
        service.get = get;
        service.getByParams = getByParams;

        service.create = create; // El carrito se crea si no hay un carrito en estado 0 que se pueda usar. Siempre primero se trae en el controlador, se verifica si existe uno en Iniciado, si no existe se crea.

        service.update = update;

        service.remove = remove;


        service.addToCart = addToCart;
        service.removeFromCart = updateProductInCart;
        service.removeFromCart = removeFromCart;
        service.reloadLastCart = reloadLastCart; // Invoca a getByParam con status 0, si existe cargalo como carrito.
        service.checkOut = checkOut; // Es solo invocar a update con el estado cambiado.

        service.goToPagina = goToPagina;
        service.next = next;
        service.prev = prev;

        return service;

        //Functions
        /**
         * @descripcion Agrega un producto al carrito. El producto es un extracto del producto total (cantidad, precio, producto_id, foto[0].url)
         * @param carrito_id
         * @param producto
         * @param callback
         */
        function addToCart(carrito_id, producto, callback) {

            var carrito_detalle = {
                carrito_id: carrito_id,
                producto_id: producto.producto_id,
                cantidad: producto.cantidad,
                en_oferta: producto.en_oferta,
                precio_unitario: producto.precio_unitario
            };

            return $http.post(url,
                {
                    'function': 'createCarritoDetalle',
                    'carrito_detalle': JSON.stringify(carrito_detalle)
                })
                .success(function (data) {


                    // Agrega un detalle al carrito y le avisa a todo el sistema para que se refresque
                    if(data != -1){
                        carrito_detalle.carrito_detalle_id = data;
                        CartVars.carrito.push(carrito_detalle);
                        CartVars.broadcast();
                    }

                    CartVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    CartVars.clearCache = true;
                    callback(data);
                });
        }

        /**
         * Modifica el detalle de un carrito
         * @param carrito_detalle
         * @param callback
         * @returns {*}
         */
        function updateProductInCart(carrito_detalle, callback) {
            return $http.post(url,
                {
                    'function': 'updateCarritoDetalle',
                    'carrito_detalle': JSON.stringify(carrito_detalle)
                })
                .success(function (data) {

                    // Agrega un detalle al carrito y le avisa a todo el sistema para que se refresque

                    if(data != -1){
                        var index = 0;
                        for (var i = 0; i<CartVars.carrito.length; i++){
                            if(CartVars.carrito[i].carrito_detalle_id == carrito_detalle.carrito_detalle_id){

                                index = i;
                            }
                        }

                        CartVars.carrito[index] = {};
                        CartVars.carrito[index] = carrito_detalle;
                        CartVars.broadcast();
                    }


                    CartVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    CartVars.clearCache = true;
                    callback(data);
                });
        }


        /**
         * Remueve un item del carrito
         * @param carrito_detalle_id
         * @param callback
         * @returns {*}
         */
        function removeFromCart(carrito_detalle_id, callback) {
            return $http.post(url,
                {
                    'function': 'removeCarritoDetalle',
                    'carrito_detalle_id': JSON.stringify(carrito_detalle_id)
                })
                .success(function (data) {

                    if(data != -1){
                        var index = 0;
                        for (var i = 0; i<CartVars.carrito.length; i++){
                            if(CartVars.carrito[i].carrito_detalle_id == carrito_detalle.carrito_detalle_id){
                                index = i;
                            }
                        }

                        CartVars.splice(index, 1);
                        CartVars.broadcast();
                    }

                    CartVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    CartVars.clearCache = true;
                    callback(data);
                });
        }

        /**
         * Retorna el último carrito en estado Iniciado para el usuario seleccionado.
         * @param usuario_id
         * @param callback
         */
        function reloadLastCart(usuario_id, callback){

            get(usuario_id, function(data){
                AcUtils.getByParams('status', 0, true, data, callback);
            });

        }

        /**
         * Cambia el estado a Pedido
         * @param carrito_id
         * @param callback
         */
        function checkOut(carrito_id, callback){
            update({carrito_id:carrito_id, status:1}, function(data){
                callback(data);
            })
        }


        /**
         * @description Obtiene todos los carritos
         * @param usuario_id, en caso traer todos los carritos, debe ser -1; Está así para que si el módulo está en la web, nunca llegue al cliente la lista completa de pedidos;
         * @param callback
         * @returns {*}
         */
        function get(usuario_id, callback) {
            var urlGet = url + '?function=getCarritos&usuario_id=';
            var $httpDefaultCache = $cacheFactory.get('$http');
            var cachedData = [];


            // Verifica si existe el cache de Carritos
            if ($httpDefaultCache.get(urlGet) != undefined) {
                if (CartVars.clearCache) {
                    $httpDefaultCache.remove(urlGet);
                }
                else {
                    cachedData = $httpDefaultCache.get(urlGet);
                    callback(cachedData);
                    return;
                }
            }


            return $http.get(urlGet, {cache: true})
                .success(function (data) {
                    $httpDefaultCache.put(urlGet + usuario_id, data);
                    CartVars.clearCache = false;
                    CartVars.paginas = (data.length % CartVars.paginacion == 0) ? parseInt(data.length / CartVars.paginacion) : parseInt(data.length / CartVars.paginacion) + 1;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                    CartVars.clearCache = false;
                })
        }


        /**
         * @description Retorna la lista filtrada de Carritos
         * @param params -> String, separado por comas (,) que contiene la lista de parámetros de búsqueda, por ej: nombre, sku
         * @param values
         * @param exact_match
         * @param usuario_id
         * @param callback
         */
        function getByParams(params, values, exact_match, usuario_id, callback) {
            get(usuario_id, function (data) {
                AcUtils.getByParams(params, values, exact_match, data, callback);
            })
        }


        /** @name: remove
         * @param carrito_id
         * @param callback
         * @description: Elimina el carrito seleccionado.
         */
        function remove(carrito_id, callback) {
            return $http.post(url,
                {function: 'removeCarrito', 'carrito_id': carrito_id})
                .success(function (data) {
                    //console.log(data);
                    if (data !== 'false') {
                        CartVars.clearCache = true;
                        callback(data);
                    }
                })
                .error(function (data) {
                    callback(data);
                })
        }

        /**
         * @description: Crea un carrito.
         * @param carrito
         * @param callback
         * @returns {*}
         */
        function create(carrito, callback) {

            return $http.post(url,
                {
                    'function': 'createCarrito',
                    'carrito': JSON.stringify(carrito)
                })
                .success(function (data) {
                    CartVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    CartVars.clearCache = true;
                    callback(data);
                });
        }


        /** @name: update
         * @param carrito
         * @param callback
         * @description: Realiza update al carrito.
         */
        function update(carrito, callback) {
            return $http.post(url,
                {
                    'function': 'updateCarrito',
                    'carrito': JSON.stringify(carrito)
                })
                .success(function (data) {
                    CartVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * Para el uso de la páginación, definir en el controlador las siguientes variables:
         *
         vm.start = 0;
         vm.pagina = CartVars.pagina;
         CartVars.paginacion = 5; Cantidad de registros por página
         vm.end = CartVars.paginacion;


         En el HTML, en el ng-repeat agregar el siguiente filtro: limitTo:appCtrl.end:appCtrl.start;

         Agregar un botón de next:
         <button ng-click="appCtrl.next()">next</button>

         Agregar un botón de prev:
         <button ng-click="appCtrl.prev()">prev</button>

         Agregar un input para la página:
         <input type="text" ng-keyup="appCtrl.goToPagina()" ng-model="appCtrl.pagina">

         */


        /**
         * @description: Ir a página
         * @param pagina
         * @returns {*}
         * uso: agregar un método
         vm.goToPagina = function () {
                vm.start= CartService.goToPagina(vm.pagina).start;
            };
         */
        function goToPagina(pagina) {

            if (isNaN(pagina) || pagina < 1) {
                CartVars.pagina = 1;
                return CartVars;
            }

            if (pagina > CartVars.paginas) {
                CartVars.pagina = CartVars.paginas;
                return CartVars;
            }

            CartVars.pagina = pagina - 1;
            CartVars.start = CartVars.pagina * CartVars.paginacion;
            return CartVars;

        }

        /**
         * @name next
         * @description Ir a próxima página
         * @returns {*}
         * uso agregar un metodo
         vm.next = function () {
                vm.start = CartService.next().start;
                vm.pagina = CartVars.pagina;
            };
         */
        function next() {

            if (CartVars.pagina + 1 > CartVars.paginas) {
                return CartVars;
            }
            CartVars.start = (CartVars.pagina * CartVars.paginacion);
            CartVars.pagina = CartVars.pagina + 1;
            //CartVars.end = CartVars.start + CartVars.paginacion;
            return CartVars;
        }

        /**
         * @name previous
         * @description Ir a página anterior
         * @returns {*}
         * uso, agregar un método
         vm.prev = function () {
                vm.start= CartService.prev().start;
                vm.pagina = CartVars.pagina;
            };
         */
        function prev() {


            if (CartVars.pagina - 2 < 0) {
                return CartVars;
            }

            //CartVars.end = CartVars.start;
            CartVars.start = (CartVars.pagina - 2 ) * CartVars.paginacion;
            CartVars.pagina = CartVars.pagina - 1;
            return CartVars;
        }


    }

    CartVars.$inject = ['$rootScope'];
    /**
     * @description Almacena variables temporales de Carritos
     * @param $rootScope
     * @constructor
     */
    function CartVars($rootScope) {
        // Cantidad de páginas total del recordset
        this.paginas = 1;
        // Página seleccionada
        this.pagina = 1;
        // Cantidad de registros por página
        this.paginacion = 10;
        // Registro inicial, no es página, es el registro
        this.start = 0;

        // Carrito Temporal
        this.carrito = [];
        // Total de productos
        this.carrito_cantidad_productos = function(){
            var cantidad = 0;
            for(var i=0; i<this.carrito.length;i++){
                cantidad = cantidad + this.carrito[i].cantidad;
            }
            return cantidad;
        };
        // Total precio
        this.carrito_total = function(){
            var precio = 0.0;
            for(var i=0; i<this.carrito.length;i++){
                precio = precio + (this.carrito[i].cantidad * this.carrito[i].precio_unitario);
            }
            return precio;
        };


        // Indica si se debe limpiar el caché la próxima vez que se solicite un get
        this.clearCache = true;

        // Transmite el aviso de actualización
        this.broadcast = function () {
            $rootScope.$broadcast("CartVars")
        };

        // Recibe aviso de actualización
        this.listen = function (callback) {
            $rootScope.$on("CartVars", callback)
        };

    }

})();